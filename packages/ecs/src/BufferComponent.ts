// TODO
// each component needs to have an unique ID for structurae schema registration
// add migration logic
// add array type
// add object type
// add binary type
// add ComponentInstance.fromJson method

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
  type: FieldType;
  default?: T;
}

interface StringFieldDef extends BaseField<string> {
  type: "string";
  maxLength?: number;
  default?: string;
}

interface NumberFieldDef extends BaseField<number> {
  type: "number";
  btype: NumberSubtype;
  default?: number;
}

interface BooleanFieldDef extends BaseField<boolean> {
  type: "boolean";
  default?: boolean;
}

type FieldDef = StringFieldDef | NumberFieldDef | BooleanFieldDef;

// Field builder classes with fluent API
class StringFieldBuilder {
  def: StringFieldDef = {
    type: "string",
  };

  /**
   * Set the maximum number of bytes for the string field
   * @param length - The maximum number of bytes for the string
   * @returns This builder for chaining
   */
  max(length: number): this {
    this.def.maxLength = length;
    return this;
  }

  /**
   * Set the default value for the string field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: string): this {
    this.def.default = value;
    return this;
  }
}

class NumberFieldBuilder {
  def: NumberFieldDef;

  /**
   * Create a number field builder with the specified binary type
   * @param btype - The binary type for the number field
   */
  constructor(btype: NumberSubtype) {
    this.def = {
      type: "number",
      btype: btype,
    };
  }

  /**
   * Set the default value for the number field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: number): this {
    this.def.default = value;
    return this;
  }
}

class BooleanFieldBuilder {
  def: BooleanFieldDef = {
    type: "boolean",
  };

  /**
   * Set the default value for the boolean field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: boolean): this {
    this.def.default = value;
    return this;
  }
}

/**
 * Schema builder API for defining component fields
 * Provides factory functions for creating typed field builders
 */
export const field = {
  /** Create a string field builder */
  string: () => new StringFieldBuilder(),
  /** Create an unsigned 8-bit integer field builder */
  uint8: () => new NumberFieldBuilder("uint8"),
  /** Create an unsigned 16-bit integer field builder */
  uint16: () => new NumberFieldBuilder("uint16"),
  /** Create an unsigned 32-bit integer field builder */
  uint32: () => new NumberFieldBuilder("uint32"),
  /** Create a signed 8-bit integer field builder */
  int8: () => new NumberFieldBuilder("int8"),
  /** Create a signed 16-bit integer field builder */
  int16: () => new NumberFieldBuilder("int16"),
  /** Create a signed 32-bit integer field builder */
  int32: () => new NumberFieldBuilder("int32"),
  /** Create a 32-bit floating point field builder */
  float32: () => new NumberFieldBuilder("float32"),
  /** Create a 64-bit floating point field builder */
  float64: () => new NumberFieldBuilder("float64"),
  /** Create a boolean field builder */
  boolean: () => new BooleanFieldBuilder(),
};

// Component schema and class types
export type ComponentSchema = Record<
  string,
  StringFieldBuilder | NumberFieldBuilder | BooleanFieldBuilder
>;

export type InferComponentType<T extends ComponentSchema> = {
  [K in keyof T]: T[K] extends StringFieldBuilder
    ? string
    : T[K] extends NumberFieldBuilder
    ? number
    : T[K] extends BooleanFieldBuilder
    ? boolean
    : never;
};

const textDecoder = new TextDecoder();

/**
 * Accessor class for string arrays stored in ArrayBuffer
 * Allows indexed access like stringArray[entityId] = "value"
 */
class StringArrayAccessor {
  constructor(private buffer: ArrayBufferLike, private maxLength: number) {}

  get(index: number): string {
    const view = new Uint8Array(this.buffer);
    const offset = index * this.maxLength;
    const bytes = view.slice(offset, offset + this.maxLength);
    const nullIndex = bytes.indexOf(0);
    const actualBytes = nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes;
    return textDecoder.decode(actualBytes);
  }

  set(index: number, value: string): void {
    const view = new Uint8Array(this.buffer);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(value);
    const offset = index * this.maxLength;
    view.fill(0, offset, offset + this.maxLength); // Clear previous data
    view.set(encoded.slice(0, this.maxLength), offset);
  }
}

/**
 * Accessor class for boolean arrays stored as bit-packed data
 * Allows indexed access like boolArray[entityId] = true
 */
class BooleanArrayAccessor {
  constructor(private buffer: ArrayBufferLike) {}

  get(index: number): boolean {
    const view = new Uint8Array(this.buffer);
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (view[byteIndex] & (1 << bitIndex)) !== 0;
  }

  set(index: number, value: boolean): void {
    const view = new Uint8Array(this.buffer);
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    if (value) {
      view[byteIndex] |= 1 << bitIndex;
    } else {
      view[byteIndex] &= ~(1 << bitIndex);
    }
  }
}

/**
 * Component class that wraps structurae View for efficient memory layout
 * Each component has a unique ID and bit position for fast query matching
 */
export class Component<T extends Record<string, any>> {
  readonly bitmask: bigint;
  private schema: Record<string, FieldDef>;
  private buffers: Map<string, ArrayBufferLike>;

  // private writtenEntities: Map<number, T> = new Map();

  /**
   * Create a new component definition
   * @param schema - The component schema built using field builders
   * @param index - The unique index assigned by World
   */
  constructor(schema: ComponentSchema, id: number) {
    // Assign unique bit position for bitmask operations
    this.bitmask = 1n << BigInt(id);

    this.schema = {};
    this.buffers = new Map<string, ArrayBufferLike>();

    for (const [field, builder] of Object.entries(schema)) {
      const fieldDef = builder.def;
      this.schema[field] = fieldDef;
      this.buffers.set(field, new ArrayBuffer(0));

      // Create a property accessor for direct data view access
      Object.defineProperty(this, field, {
        get: () => {
          const buffer = this.buffers.get(field)!;
          if (fieldDef.type === "string") {
            // For strings, return a custom accessor object
            const maxLength = (fieldDef as StringFieldDef).maxLength || 100;
            return new StringArrayAccessor(buffer, maxLength);
          } else if (fieldDef.type === "number") {
            const btype = (fieldDef as NumberFieldDef).btype;
            const TypedArray = this.getTypedArrayConstructor(btype);
            return new TypedArray(buffer);
          } else if (fieldDef.type === "boolean") {
            return new BooleanArrayAccessor(buffer);
          }
        },
        enumerable: true,
        configurable: false,
      });
    }
  }

  /**
   * Create a component instance from raw data
   * @param data - The raw data to create the component instance from
   * @returns The component instance
   * @internal
   */
  from(entityId: number, data: Record<string, any>): void {
    // Populate each field's storage array
    for (const [field, fieldDef] of Object.entries(this.schema)) {
      const buffer = this.buffers.get(field)!;

      // get value from input data or use default
      const value =
        data && field in data
          ? data[field]
          : fieldDef.default !== undefined
          ? fieldDef.default
          : fieldDef.type === "string"
          ? ""
          : fieldDef.type === "number"
          ? 0
          : false;

      // Calculate required capacity and grow if needed
      if (fieldDef.type === "string") {
        const maxLength = (fieldDef as StringFieldDef).maxLength || 100;
        const requiredBytes = (entityId + 1) * maxLength;

        if (buffer.byteLength < requiredBytes) {
          // Grow the buffer
          const newBuffer = new ArrayBuffer(requiredBytes * 2); // Grow with headroom
          new Uint8Array(newBuffer).set(new Uint8Array(buffer));
          this.buffers.set(field, newBuffer);
        }

        // Write string data
        const view = new Uint8Array(this.buffers.get(field)!);
        const encoder = new TextEncoder();
        const encoded = encoder.encode(value as string);
        const offset = entityId * maxLength;
        view.set(encoded.slice(0, maxLength), offset);
      } else if (fieldDef.type === "number") {
        const btype = (fieldDef as NumberFieldDef).btype;
        const bytesPerElement = this.getBytesPerElement(btype);
        const requiredBytes = (entityId + 1) * bytesPerElement;

        if (buffer.byteLength < requiredBytes) {
          // Grow the buffer
          const newBuffer = new ArrayBuffer(requiredBytes * 2); // Grow with headroom
          const TypedArray = this.getTypedArrayConstructor(btype);
          new TypedArray(newBuffer).set(new TypedArray(buffer));
          this.buffers.set(field, newBuffer);
        }

        // Write numeric data
        const TypedArray = this.getTypedArrayConstructor(btype);
        const view = new TypedArray(this.buffers.get(field)!);
        view[entityId] = value as number;
      } else if (fieldDef.type === "boolean") {
        const requiredBytes = Math.ceil((entityId + 1) / 8);

        if (buffer.byteLength < requiredBytes) {
          // Grow the buffer
          const newBuffer = new ArrayBuffer(requiredBytes * 2); // Grow with headroom
          new Uint8Array(newBuffer).set(new Uint8Array(buffer));
          this.buffers.set(field, newBuffer);
        }

        // Write boolean data (bit-packed)
        const view = new Uint8Array(this.buffers.get(field)!);
        const byteIndex = Math.floor(entityId / 8);
        const bitIndex = entityId % 8;
        if (value) {
          view[byteIndex] |= 1 << bitIndex;
        } else {
          view[byteIndex] &= ~(1 << bitIndex);
        }
      }
    }
  }

  private getBytesPerElement(btype: NumberSubtype): number {
    switch (btype) {
      case "uint8":
      case "int8":
        return 1;
      case "uint16":
      case "int16":
        return 2;
      case "uint32":
      case "int32":
      case "float32":
        return 4;
      case "float64":
        return 8;
    }
  }

  private getTypedArrayConstructor(btype: NumberSubtype): any {
    switch (btype) {
      case "uint8":
        return Uint8Array;
      case "uint16":
        return Uint16Array;
      case "uint32":
        return Uint32Array;
      case "int8":
        return Int8Array;
      case "int16":
        return Int16Array;
      case "int32":
        return Int32Array;
      case "float32":
        return Float32Array;
      case "float64":
        return Float64Array;
    }
  }
}
