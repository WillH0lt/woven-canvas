// TODO
// each component needs to have an unique ID for structurae schema registration
// add migration logic
// add array type
// add object type
// add ComponentInstance.fromJson method

import type { EntityId, Context, ComponentTransferData } from "../types";
import type { EventBuffer } from "../EventBuffer";
import type { EntityBuffer } from "../EntityBuffer";
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
  RefField,
  Field,
} from "./fields";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * Registry mapping field type names to their field class constructors.
 * Used to instantiate the appropriate field handler for each field type.
 * Note: RefField is handled separately since it needs EntityBuffer.
 */
const FIELD_REGISTRY: Record<string, new (fieldDef: any) => Field> = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  binary: BinaryField,
  array: ArrayField,
  tuple: TupleField,
  enum: EnumField,
};

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

  /** The component name defined by the user */
  name: string;

  readonly isSingleton: boolean;

  private initialized: boolean = false;

  private eventBuffer: EventBuffer | null = null;

  private entityBuffer: EntityBuffer | null = null;

  /** The component schema (field definitions) */
  readonly schema: Record<string, FieldDef>;
  private fieldNames: string[];

  /** Field handler instances for each field */
  private fields: Record<string, Field> = {};

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
    def: ComponentDef<T> | SingletonDef<T>
  ): Component<T> {
    return new Component<T>(def.name, def.schema, def.isSingleton);
  }

  /**
   * Create a Component instance from transfer data (for worker threads).
   * @param name - The component name
   * @param transferData - The transfer data containing buffer, componentId, schema, etc.
   * @param eventBuffer - The event buffer for recording changes
   * @param entityBuffer - The entity buffer for checking entity liveness
   * @returns A new initialized Component instance
   * @internal
   */
  static fromTransfer<T extends ComponentSchema>(
    name: string,
    maxEntities: number,
    transferData: ComponentTransferData,
    eventBuffer: EventBuffer,
    entityBuffer: EntityBuffer
  ): Component<T> {
    const component = new Component<T>(
      name,
      transferData.schema as any,
      transferData.isSingleton
    );
    component.initialize(
      transferData.componentId,
      maxEntities,
      eventBuffer,
      entityBuffer,
      transferData.buffer
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
    isSingleton: boolean = false
  ) {
    this.name = name;
    this.isSingleton = isSingleton;

    this.schema = {};
    this.fieldNames = [];

    for (const [fieldName, fieldOrBuilder] of Object.entries(schema)) {
      // Handle both builder format ({def: FieldDef}) and direct FieldDef format
      const fieldDef = (fieldOrBuilder as any).def || fieldOrBuilder;
      this.schema[fieldName] = fieldDef;
      this.fieldNames.push(fieldName);
    }

    // Create master instances with property descriptors for direct buffer access
    this.readonlyMaster = {} as InferComponentType<T>;
    this.writableMaster = {} as InferComponentType<T>;
  }

  initialize(
    id: number,
    maxEntities: number,
    eventBuffer: EventBuffer,
    entityBuffer: EntityBuffer,
    buffer?: ComponentBuffer<T>
  ): void {
    this.ensureNotInitialized();
    this.initialized = true;

    this.componentId = id;
    this.eventBuffer = eventBuffer;
    this.entityBuffer = entityBuffer;

    const bufferSize = this.isSingleton ? 1 : maxEntities;

    // Initialize field instances for each field in the schema
    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      this.fields[fieldName] = this.createFieldInstance(fieldDef);
    }

    if (buffer) {
      // Use provided buffer for field storage
      this._buffer = buffer;
    } else {
      // Create new buffer storage for each field
      const newBuffer: any = {};
      for (const fieldName of this.fieldNames) {
        const field = this.fields[fieldName];
        const { view } = field.initializeStorage(bufferSize, BufferConstructor);
        newBuffer[fieldName] = view;
      }
      this._buffer = newBuffer as ComponentBuffer<T>;
    }

    // Initialize master objects for direct buffer access
    this.initializeMasters();

    if (this.isSingleton) {
      this.initializeSingletonDefaults();
    }
  }

  /**
   * Ensure the component has not been initialized yet.
   * @throws Error if already initialized
   */
  private ensureNotInitialized(): void {
    if (this.initialized) {
      throw new Error(
        `Component has already been initialized. ` +
          `Each component instance can only be registered with one World. ` +
          `If you need multiple worlds, define separate component instances for each.`
      );
    }
  }

  /**
   * Create a field handler instance for the given field definition.
   * @param fieldDef - The field definition
   * @returns The field handler instance
   */
  private createFieldInstance(fieldDef: FieldDef): Field {
    if (fieldDef.type === "ref") {
      return new RefField(fieldDef, this.entityBuffer!);
    }

    const FieldClass = FIELD_REGISTRY[fieldDef.type];
    if (!FieldClass) {
      throw new Error(`Unknown field type: ${fieldDef.type}`);
    }

    return new FieldClass(fieldDef);
  }

  public get buffer(): ComponentBuffer<T> {
    return this._buffer as ComponentBuffer<T>;
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
      const field = this.fields[fieldName];

      const value = field.getDefaultValue();
      field.setValue(array, SINGLETON_INDEX, value);
    }
  }

  /**
   * Define getters/setters on master instances for direct buffer access
   */
  private initializeMasters(): void {
    if (this._buffer === null) {
      throw new Error("Component buffers not initialized");
    }

    // Define getters/setters on master instances for each field
    for (const fieldName of this.fieldNames) {
      const field = this.fields[fieldName];

      field.defineReadonly(
        this.readonlyMaster,
        fieldName,
        this._buffer,
        () => this.readonlyEntityId
      );
      field.defineWritable(
        this.writableMaster,
        fieldName,
        this._buffer,
        () => this.writableEntityId
      );
    }
  }

  /**
   * Copy data into a component instance.
   * Pushes a CHANGED event for the entity
   * @param entityId - The entity ID to populate
   * @param data - The raw data to create the component instance from
   * @internal
   */
  copy(entityId: number, data: any): void {
    for (let i = 0; i < this.fieldNames.length; i++) {
      const fieldName = this.fieldNames[i];
      const array = (this.buffer as any)[fieldName];
      const field = this.fields[fieldName];

      const hasValue = data && fieldName in data;
      const value = hasValue ? data[fieldName] : field.getDefaultValue();

      field.setValue(array, entityId, value);
    }

    // For singletons, use SINGLETON_ENTITY_ID for change tracking
    const eventEntityId = this.isSingleton ? SINGLETON_ENTITY_ID : entityId;
    this.eventBuffer?.pushChanged(eventEntityId, this.componentId);
  }

  /**
   * Read entity's component data
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
   * Write to entity's component data
   * Returns the writable master instance bound to the entity
   * Property access goes directly through getters/setters to the underlying buffers
   * Pushes a CHANGED event to the event buffer for reactive queries
   * @param entityId - The entity ID to write to
   * @returns The writable master object for reading and writing component fields
   */
  write(entityId: EntityId): InferComponentType<T> {
    this.writableEntityId = entityId;

    // For singletons, use SINGLETON_ENTITY_ID for change tracking
    const eventEntityId = this.isSingleton ? SINGLETON_ENTITY_ID : entityId;
    this.eventBuffer?.pushChanged(eventEntityId, this.componentId);

    return this.writableMaster;
  }

  /**
   * Create a plain object snapshot of entity's component data.
   * Unlike read(), this returns a regular object that can be safely spread,
   * stored, or passed around without the getter/setter binding behavior.
   *
   * Use this when you need to:
   * - Copy component data to another data structure
   * - Store component state for later comparison
   * - Pass component data to external code
   *
   * @param entityId - The entity ID to snapshot
   * @returns A plain object copy of the component's field values
   */
  snapshot(entityId: EntityId): InferComponentType<T> {
    const result = {} as InferComponentType<T>;
    for (let i = 0; i < this.fieldNames.length; i++) {
      const fieldName = this.fieldNames[i];
      const array = (this.buffer as any)[fieldName];
      (result as any)[fieldName] = array.get
        ? array.get(entityId)
        : array[entityId];
    }
    return result;
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
  _getInstance(ctx: Context): Component<T> {
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
    return this._getInstance(ctx).componentId;
  }

  /**
   * Read entity's component data
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to read from
   * @returns The readonly component data
   */
  read(ctx: Context, entityId: EntityId): Readonly<InferComponentType<T>> {
    return this._getInstance(ctx).read(entityId);
  }

  /**
   * Write to entity's component data.
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to write to
   * @returns The writable component data
   */
  write(ctx: Context, entityId: EntityId): InferComponentType<T> {
    return this._getInstance(ctx).write(entityId);
  }

  /**
   * Copy data into a component.
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to populate
   * @param data - The raw data to create the component instance from
   */
  copy(
    ctx: Context,
    entityId: EntityId,
    data: Partial<InferComponentType<T>>
  ): void {
    this._getInstance(ctx).copy(entityId, data);
  }

  /**
   * Create a plain object snapshot of entity's component data.
   * Unlike read(), this returns a regular object that can be safely spread,
   * stored, or passed around without the getter/setter binding behavior.
   *
   * Use this when you need to:
   * - Copy component data to another data structure
   * - Store component state for later comparison
   * - Pass component data to external code
   *
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to snapshot
   * @returns A plain object copy of the component's field values
   *
   * @example
   * ```typescript
   * // WRONG - captures getter reference, not value
   * state[entityId].Position = Position.read(ctx, entityId);
   *
   * // RIGHT - creates a plain object copy
   * state[entityId].Position = Position.snapshot(ctx, entityId);
   * ```
   */
  snapshot(ctx: Context, entityId: EntityId): InferComponentType<T> {
    return this._getInstance(ctx).snapshot(entityId);
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
 * Singleton definition class that serves as a descriptor and provides
 * read/write/copy access to singleton data via context lookup.
 * Singletons don't require an entity ID since there's only one instance.
 */
export class SingletonDef<T extends ComponentSchema> {
  readonly name: string;
  readonly schema: T;
  readonly isSingleton: true = true;

  constructor(name: string, schema: T) {
    this.name = name;
    this.schema = schema;
  }

  /**
   * Get the Component instance from the context.
   * @internal
   */
  _getInstance(ctx: Context): Component<T> {
    const instance = ctx.components[this.name] as Component<T> | undefined;
    if (!instance) {
      throw new Error(
        `Singleton "${this.name}" is not registered with this World.`
      );
    }
    if (!instance.isSingleton) {
      throw new Error(
        `"${this.name}" is not a singleton. Use defineSingleton() to create singletons.`
      );
    }
    return instance;
  }

  /**
   * Get the component ID for this singleton in the given context.
   */
  getComponentId(ctx: Context): number {
    return this._getInstance(ctx).componentId;
  }

  /**
   * Read the singleton's data (readonly access).
   * @param ctx - The context containing the singleton instance
   * @returns The readonly singleton data
   */
  read(ctx: Context): Readonly<InferComponentType<T>> {
    return this._getInstance(ctx).read(SINGLETON_INDEX);
  }

  /**
   * Write to the singleton's data.
   * Automatically triggers a change event for tracking.
   * @param ctx - The context containing the singleton instance
   * @returns The writable singleton data
   */
  write(ctx: Context): InferComponentType<T> {
    return this._getInstance(ctx).write(SINGLETON_INDEX);
  }

  /**
   * Copy data into the singleton.
   * Useful for batch initialization of multiple fields at once.
   * Automatically triggers a change event for tracking.
   * @param ctx - The context containing the singleton instance
   * @param data - The data to copy into the singleton
   */
  copy(ctx: Context, data: Partial<InferComponentType<T>>): void {
    this._getInstance(ctx).copy(SINGLETON_INDEX, data);
  }

  /**
   * Create a plain object snapshot of the singleton's data.
   * Unlike read(), this returns a regular object that can be safely spread,
   * stored, or passed around without the getter/setter binding behavior.
   *
   * @param ctx - The context containing the singleton instance
   * @returns A plain object copy of the singleton's field values
   */
  snapshot(ctx: Context): InferComponentType<T> {
    return this._getInstance(ctx).snapshot(SINGLETON_INDEX);
  }
}

/**
 * Define a singleton with a name and schema.
 * A singleton is a component with exactly one instance per world.
 * No entity ID is needed to access it.
 *
 * @template T - The singleton schema type
 * @param name - The name of the singleton (e.g., "Mouse", "Time")
 * @param schema - The singleton schema built using field builders
 * @returns A SingletonDef descriptor for direct read/write/copy access
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
 *
 * // Use directly without useSingleton:
 * const mouse = Mouse.read(ctx);
 * const writableMouse = Mouse.write(ctx);
 * Mouse.copy(ctx, { x: 100, y: 200 });
 * ```
 */
export function defineSingleton<T extends ComponentSchema>(
  name: string,
  schema: T
): SingletonDef<T> {
  return new SingletonDef(name, schema);
}
