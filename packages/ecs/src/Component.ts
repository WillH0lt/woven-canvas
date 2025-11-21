// TODO
// each component needs to have an unique ID for structurae schema registration
// add migration logic
// add array type
// add object type
// add binary type
// add ComponentInstance.fromJson method

import { View, type ViewConstructor, type ViewInstance } from "structurae";

// Field type definitions
type FieldType = "string" | "number" | "boolean";
type NumberSubtype =
  | "uint8"
  | "uint16"
  | "uint32"
  | "int8"
  | "int16"
  | "int32"
  | "float32"
  | "float64";

// Schema field builders
interface BaseField<T> {
  _type: FieldType;
  _default?: T;
}

interface StringField extends BaseField<string> {
  _type: "string";
  _maxLength?: number;
  _default?: string;
}

interface NumberField extends BaseField<number> {
  _type: "number";
  _btype: NumberSubtype;
  _default?: number;
}

interface BooleanField extends BaseField<boolean> {
  _type: "boolean";
  _default?: boolean;
}

type Field = StringField | NumberField | BooleanField;

// Field builder classes with fluent API
class StringFieldBuilder {
  private field: StringField = {
    _type: "string",
  };

  max(length: number): this {
    this.field._maxLength = length;
    return this;
  }

  default(value: string): this {
    this.field._default = value;
    return this;
  }

  _build(): StringField {
    return this.field;
  }
}

class NumberFieldBuilder {
  private field: NumberField;

  constructor(btype: NumberSubtype) {
    this.field = {
      _type: "number",
      _btype: btype,
    };
  }

  default(value: number): this {
    this.field._default = value;
    return this;
  }

  _build(): NumberField {
    return this.field;
  }
}

class BooleanFieldBuilder {
  private field: BooleanField = {
    _type: "boolean",
  };

  default(value: boolean): this {
    this.field._default = value;
    return this;
  }

  _build(): BooleanField {
    return this.field;
  }
}

// Schema builder API
export const field = {
  string: () => new StringFieldBuilder(),
  uint8: () => new NumberFieldBuilder("uint8"),
  uint16: () => new NumberFieldBuilder("uint16"),
  uint32: () => new NumberFieldBuilder("uint32"),
  int8: () => new NumberFieldBuilder("int8"),
  int16: () => new NumberFieldBuilder("int16"),
  int32: () => new NumberFieldBuilder("int32"),
  float32: () => new NumberFieldBuilder("float32"),
  float64: () => new NumberFieldBuilder("float64"),
  boolean: () => new BooleanFieldBuilder(),
};

// Component schema and class types
type ComponentSchema = Record<
  string,
  StringFieldBuilder | NumberFieldBuilder | BooleanFieldBuilder
>;

type InferComponentType<T extends ComponentSchema> = {
  [K in keyof T]: T[K] extends StringFieldBuilder
    ? string
    : T[K] extends NumberFieldBuilder
    ? number
    : T[K] extends BooleanFieldBuilder
    ? boolean
    : never;
};

// Component class that wraps structurae View
export class Component<T extends Record<string, any>> {
  private static nextBitPosition = 0;

  private id: string;
  private bitPosition: number;
  private ViewClass: ViewConstructor<T>;
  private schema: Record<string, Field>;
  private defaults: Partial<T>;

  constructor(schema: ComponentSchema) {
    // Generate a random ID for the component
    this.id = `component_${Math.random()
      .toString(36)
      .substring(2, 11)}_${Date.now().toString(36)}`;

    // Assign unique bit position for bitmask operations
    this.bitPosition = Component.nextBitPosition++;

    this.schema = {};
    this.defaults = {};

    // Build the schema and extract defaults
    const properties: any = {};
    for (const [key, builder] of Object.entries(schema)) {
      const field = (builder as any)._build() as Field;
      this.schema[key] = field;

      if (field._default !== undefined) {
        this.defaults[key as keyof T] = field._default as any;
      }

      // Convert to structurae format
      if (field._type === "string") {
        properties[key] = {
          type: "string",
          maxLength: field._maxLength || 255,
        };
      } else if (field._type === "number") {
        properties[key] = {
          type: "number",
          btype: field._btype,
        };
      } else if (field._type === "boolean") {
        properties[key] = {
          type: "boolean",
        };
      }
    }

    // Create the View class
    const view = new View();
    this.ViewClass = view.create<T>({
      $id: this.id,
      type: "object",
      properties,
    } as any);
  }

  // Parse with validation
  from(data: unknown): ComponentInstance<T> {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid input: expected an object");
    }

    const inputData = data as Record<string, any>;
    const validatedData: Record<string, any> = {};

    // Validate and populate all schema fields
    for (const [key, field] of Object.entries(this.schema)) {
      if (key in inputData) {
        // Field exists in input, use it
        validatedData[key] = inputData[key];
      } else if (field._default !== undefined) {
        // Field missing but has default
        validatedData[key] = field._default;
      } else {
        // Field missing, no default - use type-based fallback
        if (field._type === "string") {
          validatedData[key] = "";
        } else if (field._type === "number") {
          validatedData[key] = 0;
        } else if (field._type === "boolean") {
          validatedData[key] = false;
        }
      }
    }

    const fullData = { ...this.defaults, ...data } as T;
    const viewInstance = this.ViewClass.from(fullData);
    return ComponentInstance.create<T>(viewInstance);
  }

  // Get the component ID
  getId(): string {
    return this.id;
  }

  // Get the bitmask for this component
  getBitmask(): bigint {
    return 1n << BigInt(this.bitPosition);
  }
}

// Component instance wrapper with proxy for direct property access via .value
export class ComponentInstance<T extends Record<string, any>> {
  private viewInstance: ViewInstance<T>;
  value: T;

  constructor(viewInstance: ViewInstance<T>) {
    this.viewInstance = viewInstance;

    // Create a proxy for the value property that intercepts property access
    this.value = new Proxy({} as T, {
      get(target: T, prop: string | symbol) {
        if (typeof prop === "symbol") {
          return (target as any)[prop];
        }
        return (viewInstance as any).get(prop as string);
      },

      set(target: T, prop: string | symbol, value: any) {
        if (typeof prop === "symbol") {
          return false;
        }
        (viewInstance as any).set(prop as string, value);
        return true;
      },
    });
  }

  toJSON(): T {
    return (this.viewInstance as any).toJSON();
  }

  static create<T extends Record<string, any>>(
    viewInstance: ViewInstance<T>
  ): ComponentInstance<T> {
    return new ComponentInstance(viewInstance);
  }
}

// Factory function to create components
export function component<T extends ComponentSchema>(
  schema: T
): Component<InferComponentType<T>> {
  return new Component(schema) as Component<InferComponentType<T>>;
}
