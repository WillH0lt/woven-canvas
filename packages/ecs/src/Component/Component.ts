// TODO
// each component needs to have an unique ID for structurae schema registration
// add migration logic
// add array type
// add object type
// add ComponentInstance.fromJson method

import type { EntityId, Context } from "../types";
import type { EventBuffer } from "../EventBuffer";
import type {
  ComponentSchema,
  InferComponentType,
  ComponentBuffer,
  FieldDef,
} from "./types";
import {
  NumberField,
  BooleanField,
  StringField,
  BinaryField,
  ArrayField,
  TupleField,
  EnumField,
  type Field,
} from "./fields";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * Sentinel entity ID used for singleton change events.
 * Uses max u32 value which will never be used by real entities.
 */
export const SINGLETON_ENTITY_ID = 0xffffffff;

/**
 * Index used to access singleton data in the buffer (always 0 since there's only one instance)
 */
const SINGLETON_INDEX = 0;

/**
 * Component class that uses TypedArrays for efficient memory layout
 * Each component has a unique ID for fast query matching
 *
 * Can also be used as a singleton (single instance, no entity ID needed)
 * by setting isSingleton = true during construction.
 */
export class Component<T extends ComponentSchema> {
  /** The unique component ID (0-based index) assigned during initialization */
  componentId: number = -1;
  name: string;

  /** Whether this component is a singleton (single instance, no entity ID) */
  readonly isSingleton: boolean;

  private initialized: boolean = false;

  /** Reference to the event buffer for pushing CHANGED events */
  private eventBuffer: EventBuffer | null = null;

  /** The component schema (field definitions) */
  readonly schema: Record<string, FieldDef>;
  private fieldNames: string[];

  // Typed buffer accessor for field access (e.g., Position.buffer.x[eid])
  private _buffer: ComponentBuffer<T> | null = null;

  // Binding instances - master objects with getters/setters
  private readonly readonlyMaster: InferComponentType<T>;
  private readonly writableMaster: InferComponentType<T>;

  // Current bound entity state
  private readonlyEntityId: EntityId = 0;
  private writableEntityId: EntityId = 0;

  /**
   * Create a Component instance from a ComponentDef descriptor.
   * @param def - The component definition
   * @returns A new Component instance
   */
  static fromDef<T extends ComponentSchema>(
    def: ComponentDef<T>
  ): Component<T> {
    return new Component<T>(def.name, def.schema, def.isSingleton);
  }

  /**
   * Create a Component instance from transfer data (for worker threads).
   * @param name - The component name
   * @param transferData - The transfer data containing buffer, componentId, schema, etc.
   * @param eventBuffer - The event buffer for recording changes
   * @returns A new initialized Component instance
   * @internal
   */
  static fromTransferData<T extends ComponentSchema>(
    name: string,
    transferData: {
      componentId: number;
      buffer: ComponentBuffer<T>;
      schema: Record<string, FieldDef>;
      isSingleton: boolean;
    },
    eventBuffer: EventBuffer
  ): Component<T> {
    const component = new Component<T>(
      name,
      transferData.schema as any,
      transferData.isSingleton,
      true // isPrebuiltSchema
    );
    component.fromTransfer(
      transferData.componentId,
      transferData.buffer,
      eventBuffer
    );
    return component;
  }

  /**
   * Create a new component definition
   * @param name - The component name
   * @param schema - The component schema built using field builders OR a pre-built schema (FieldDef)
   * @param isSingleton - Whether this is a singleton (default: false)
   * @param isPrebuiltSchema - If true, schema is already in FieldDef form (internal use for transfers)
   */
  constructor(
    name: string,
    schema: T | Record<string, FieldDef>,
    isSingleton: boolean = false,
    isPrebuiltSchema: boolean = false
  ) {
    this.name = name;
    this.isSingleton = isSingleton;

    this.schema = {};
    this.fieldNames = [];

    if (isPrebuiltSchema) {
      // Schema is already in FieldDef form (from transfer)
      for (const [fieldName, fieldDef] of Object.entries(
        schema as Record<string, FieldDef>
      )) {
        this.schema[fieldName] = fieldDef;
        this.fieldNames.push(fieldName);
      }
    } else {
      // Initialize storage arrays for each field (schema has field builders)
      for (const [fieldName, builder] of Object.entries(schema as T)) {
        const fieldDef = (builder as any).def;
        this.schema[fieldName] = fieldDef;
        this.fieldNames.push(fieldName);
      }
    }

    // Create master instances with property descriptors for direct buffer access
    this.readonlyMaster = {} as InferComponentType<T>;
    this.writableMaster = {} as InferComponentType<T>;
  }

  initialize(id: number, maxEntities: number, eventBuffer: EventBuffer): void {
    // Guard against double initialization
    if (this.initialized) {
      throw new Error(
        `Component has already been initialized. ` +
          `Each component instance can only be registered with one World. ` +
          `If you need multiple worlds, define separate component instances for each.`
      );
    }
    this.initialized = true;

    this.componentId = id;
    this.eventBuffer = eventBuffer;

    // Singletons only need buffer space for 1 entity
    const bufferSize = this.isSingleton ? 1 : maxEntities;

    const bufferProxy: any = {};

    // Initialize storage arrays for each field
    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      // Get the appropriate handler for this field type
      const field = this.getField(fieldDef.type);
      const { buffer, view } = field.initializeStorage(
        bufferSize,
        fieldDef,
        BufferConstructor
      );

      bufferProxy[fieldName] = view;
    }

    this._buffer = bufferProxy as ComponentBuffer<T>;

    this.initializeMasters();

    // Initialize singleton with default values
    if (this.isSingleton) {
      this.initializeSingletonDefaults();
    }
  }

  public get buffer(): ComponentBuffer<T> {
    return this._buffer as ComponentBuffer<T>;
  }

  /**
   * Initialize component in a worker context with transferred buffers
   * @param componentId - The component ID
   * @param buffer - The transferred buffer object containing typed arrays
   * @param eventBuffer - The event buffer for recording changes
   * @internal
   */
  fromTransfer(
    componentId: number,
    buffer: ComponentBuffer<T>,
    eventBuffer: EventBuffer
  ): void {
    if (this.initialized) {
      throw new Error(`Component has already been initialized.`);
    }
    this.initialized = true;
    this.componentId = componentId;
    this._buffer = buffer;
    this.eventBuffer = eventBuffer;
    this.initializeMasters();
  }

  /**
   * Initialize singleton with default values
   */
  private initializeSingletonDefaults(): void {
    if (this._buffer === null) {
      throw new Error("Component buffers not initialized");
    }

    for (let i = 0; i < this.fieldNames.length; i++) {
      const fieldName = this.fieldNames[i];
      const array = (this._buffer as any)[fieldName];
      const fieldDef = this.schema[fieldName];
      const field = this.getField(fieldDef.type);

      const value = field.getDefaultValue(fieldDef);
      field.setValue(array, SINGLETON_INDEX, value);
    }
  }

  private initializeMasters(): void {
    if (this._buffer === null) {
      throw new Error("Component buffers not initialized");
    }

    // Define getters/setters on master instances for each field
    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      const field = this.getField(fieldDef.type);

      field.defineReadonly(
        this.readonlyMaster,
        fieldName,
        this._buffer,
        () => this.readonlyEntityId,
        fieldDef
      );
      field.defineWritable(
        this.writableMaster,
        fieldName,
        this._buffer,
        () => this.writableEntityId,
        fieldDef
      );
    }
  }

  /**
   * Get the appropriate field type handler
   * @param type - The field type
   * @returns The field type handler
   */
  private getField(type: string): Field {
    switch (type) {
      case "string":
        return StringField;
      case "number":
        return NumberField;
      case "boolean":
        return BooleanField;
      case "binary":
        return BinaryField;
      case "array":
        return ArrayField;
      case "tuple":
        return TupleField;
      case "enum":
        return EnumField;
      default:
        throw new Error(`Unknown field type: ${type}`);
    }
  }

  /**
   * Create a component instance from raw data
   * @param entityId - The entity ID to populate
   * @param data - The raw data to create the component instance from
   * @internal
   */
  from(entityId: number, data: T): void {
    // Populate each field's storage array using cached field names
    for (let i = 0; i < this.fieldNames.length; i++) {
      const fieldName = this.fieldNames[i];
      const array = (this.buffer as any)[fieldName];
      const fieldDef = this.schema[fieldName];
      const field = this.getField(fieldDef.type);

      // Get value from input data or use default
      let value =
        data && fieldName in data
          ? data[fieldName]
          : field.getDefaultValue(fieldDef);

      // For enum fields, convert string value to index
      if (fieldDef.type === "enum" && typeof value === "string") {
        const sortedValues = [...(fieldDef as any).values].sort();
        const index = sortedValues.indexOf(value);
        value = index >= 0 ? index : 0;
      }

      // Store value using the handler
      field.setValue(array, entityId, value);
    }
  }

  /**
   * Read a component's data for a specific entity
   * Returns the readonly master instance bound to the entity
   * Property access goes directly through getters to the underlying buffers
   * @param entityId - The entity ID to read from
   * @returns The readonly master object with the component's field values
   */
  read(entityId: EntityId): Readonly<InferComponentType<T>> {
    this.readonlyEntityId = entityId;
    return this.readonlyMaster;
  }

  /**
   * Write to a component's data for a specific entity
   * Returns the writable master instance bound to the entity
   * Property access goes directly through getters/setters to the underlying buffers
   * Changes are immediate - no commit() needed
   * Automatically pushes a CHANGED event to the event buffer for reactive queries
   * @param entityId - The entity ID to write to
   * @returns The writable master object for reading and writing component fields
   */
  write(entityId: EntityId): InferComponentType<T> {
    this.writableEntityId = entityId;

    this.eventBuffer?.pushChanged(entityId, this.componentId);

    return this.writableMaster;
  }

  /**
   * Read a singleton's data (no entity ID needed).
   * Only valid for singleton components.
   * @returns The readonly singleton data
   * @internal - Use readSingleton(Component) for proper initialization handling
   */
  readSingleton(): Readonly<InferComponentType<T>> {
    this.readonlyEntityId = SINGLETON_INDEX;
    return this.readonlyMaster;
  }

  /**
   * Write to a singleton's data (no entity ID needed).
   * Only valid for singleton components.
   * Automatically pushes a CHANGED event using SINGLETON_ENTITY_ID.
   * @returns The writable singleton data
   * @internal - Use writeSingleton(Component) for proper initialization handling
   */
  writeSingleton(): InferComponentType<T> {
    this.writableEntityId = SINGLETON_INDEX;

    // Push change event using sentinel entity ID
    this.eventBuffer?.pushChanged(SINGLETON_ENTITY_ID, this.componentId);

    return this.writableMaster;
  }
}

/**
 * Component definition class that serves as a descriptor and provides
 * read/write access to component data via context lookup.
 */
export class ComponentDef<T extends ComponentSchema> {
  readonly name: string;
  readonly schema: T;
  readonly isSingleton: boolean;

  constructor(name: string, schema: T, isSingleton: boolean = false) {
    this.name = name;
    this.schema = schema;
    this.isSingleton = isSingleton;
  }

  /**
   * Get the Component instance from the context.
   * @internal
   */
  getInstance(ctx: Context): Component<T> {
    const instance = ctx.components[this.name] as Component<T> | undefined;
    if (!instance) {
      throw new Error(
        `Component "${this.name}" is not registered with this World.`
      );
    }
    return instance;
  }

  /**
   * Get the component ID for this component in the given context.
   */
  getComponentId(ctx: Context): number {
    return this.getInstance(ctx).componentId;
  }

  /**
   * Read a component's data for a specific entity.
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to read from
   * @returns The readonly component data
   */
  read(ctx: Context, entityId: EntityId): Readonly<InferComponentType<T>> {
    return this.getInstance(ctx).read(entityId);
  }

  /**
   * Write to a component's data for a specific entity.
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to write to
   * @returns The writable component data
   */
  write(ctx: Context, entityId: EntityId): InferComponentType<T> {
    return this.getInstance(ctx).write(entityId);
  }

  /**
   * Read a singleton's data (no entity ID needed).
   * @param ctx - The context containing the singleton instance
   * @returns The readonly singleton data
   */
  readSingleton(ctx: Context): Readonly<InferComponentType<T>> {
    return this.getInstance(ctx).readSingleton();
  }

  /**
   * Write to a singleton's data (no entity ID needed).
   * @param ctx - The context containing the singleton instance
   * @returns The writable singleton data
   */
  writeSingleton(ctx: Context): InferComponentType<T> {
    return this.getInstance(ctx).writeSingleton();
  }
}

/**
 * Define a component with a name and schema.
 * Returns a ComponentDef that can be used to create per-world Component instances.
 *
 * @template T - The component schema type
 * @param name - The name of the component (e.g., "Position", "Velocity")
 * @param schema - The component schema built using field builders
 * @returns A ComponentDef descriptor
 *
 * @example
 * ```typescript
 * import { field, defineComponent } from "@infinitecanvas/ecs";
 *
 * export const Position = defineComponent("Position", {
 *   x: field.float32(),
 *   y: field.float32(),
 * });
 * ```
 */
export function defineComponent<T extends ComponentSchema>(
  name: string,
  schema: T
): ComponentDef<T> {
  return new ComponentDef(name, schema, false);
}

/**
 * Define a singleton with a name and schema.
 * A singleton is a component with exactly one instance per world.
 * No entity ID is needed to access it.
 *
 * @template T - The singleton schema type
 * @param name - The name of the singleton (e.g., "Mouse", "Time")
 * @param schema - The singleton schema built using field builders
 * @returns A ComponentDef descriptor configured as a singleton
 *
 * @example
 * ```typescript
 * import { field, defineSingleton } from "@infinitecanvas/ecs";
 *
 * export const Mouse = defineSingleton("Mouse", {
 *   x: field.float32().default(0),
 *   y: field.float32().default(0),
 *   pressed: field.boolean().default(false),
 * });
 * ```
 */
export function defineSingleton<T extends ComponentSchema>(
  name: string,
  schema: T
): ComponentDef<T> {
  return new ComponentDef(name, schema, true);
}
