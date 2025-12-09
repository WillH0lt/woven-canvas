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
 * Field type registry. RefField requires EntityBuffer so it's instantiated separately.
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
 * Sentinel entity ID for singleton change events.
 * Uses max u32 value to avoid collision with real entity IDs.
 */
export const SINGLETON_ENTITY_ID = 0xffffffff;

/** Singleton data is always at index 0 */
const SINGLETON_INDEX = 0;

/**
 * Runtime component storage using TypedArrays.
 * Supports both entity components and singletons.
 */
export class Component<T extends ComponentSchema> {
  /** Unique component ID (0-based index) */
  componentId: number = -1;

  /** Component name */
  name: string;

  readonly isSingleton: boolean;

  private initialized: boolean = false;

  private eventBuffer: EventBuffer | null = null;

  private entityBuffer: EntityBuffer | null = null;

  /** Field definitions */
  readonly schema: Record<string, FieldDef>;
  private fieldNames: string[];

  /** Field handler instances */
  private fields: Record<string, Field> = {};

  /** Typed buffer accessor (e.g., Position.buffer.x[eid]) */
  private _buffer: ComponentBuffer<T> | null = null;

  /** Master objects with getters/setters bound to current entity */
  private readonly readonlyMaster: InferComponentType<T>;
  private readonly writableMaster: InferComponentType<T>;

  /** Currently bound entity IDs for read/write operations */
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
   * Reconstruct a Component from transfer data (for worker threads)
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
   * Create a new component
   * @param name - Component name
   * @param schema - Field definitions or field builders
   * @param isSingleton - Whether this is a singleton (default: false)
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
      const fieldDef = (fieldOrBuilder as any).def || fieldOrBuilder;
      this.schema[fieldName] = fieldDef;
      this.fieldNames.push(fieldName);
    }

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

    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      this.fields[fieldName] = this.createFieldInstance(fieldDef);
    }

    if (buffer) {
      this._buffer = buffer;
    } else {
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
   * Ensure the component hasn't been initialized yet
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
   * Copy data into a component instance and push a CHANGED event
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
   * Read component data from an entity (readonly)
   * Returns a bound master object with getters for each field
   * @param entityId - Entity ID to read from
   * @returns Readonly master object with component field values
   */
  read(entityId: EntityId): Readonly<InferComponentType<T>> {
    this.readonlyEntityId = entityId;
    return this.readonlyMaster;
  }

  /**
   * Write component data to an entity
   * Returns a bound master object with getters/setters for each field
   * Automatically pushes a CHANGED event for reactive queries
   * @param entityId - Entity ID to write to
   * @returns Writable master object for reading/writing component fields
   */
  write(entityId: EntityId): InferComponentType<T> {
    this.writableEntityId = entityId;

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
 * Component descriptor that provides context-aware access to component data.
 * Created by defineComponent() and used to read/write component data via context lookup.
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
   * Get the component ID in a given context
   */
  _getComponentId(ctx: Context): number {
    return this._getInstance(ctx).componentId;
  }

  /**
   * Read component data from an entity (readonly).
   * Returns a bound object with read-only getters that access the underlying buffers.
   *
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to read from
   * @returns Readonly object with component field values
   *
   * @example
   * ```typescript
   * import { Position } from './components';
   *
   * function renderSystem(ctx: Context) {
   *   const pos = Position.read(ctx, entityId);
   *   console.log(pos.x, pos.y); // Access current values
   * }
   * ```
   */
  read(ctx: Context, entityId: EntityId): Readonly<InferComponentType<T>> {
    return this._getInstance(ctx).read(entityId);
  }

  /**
   * Write component data to an entity.
   * Returns a bound object with getters/setters that access the underlying buffers.
   *
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to write to
   * @returns Writable object with component field getters/setters
   *
   * @example
   * ```typescript
   * import { Position, Velocity } from './components';
   *
   * function movementSystem(ctx: Context) {
   *   const pos = Position.write(ctx, entityId);
   *   const vel = Velocity.read(ctx, entityId);
   *   pos.x += vel.x; // Modify fields directly
   *   pos.y += vel.y;
   * }
   * ```
   */
  write(ctx: Context, entityId: EntityId): InferComponentType<T> {
    return this._getInstance(ctx).write(entityId);
  }

  /**
   * Copy data into a component. Batch-set multiple fields at once.
   * Fields not specified in the data object retain their current values.
   *
   * @param ctx - The context containing the component instance
   * @param entityId - The entity ID to write to
   * @param data - Partial component data to copy (unspecified fields keep current values)
   *
   * @example
   * ```typescript
   * import { Position } from './components';
   *
   * // Set multiple fields at once
   * Position.copy(ctx, entityId, { x: 100, y: 200 });
   *
   * // Useful for initialization
   * const newEntity = createEntity(ctx);
   * Position.copy(ctx, newEntity, { x: 0, y: 0 });
   * ```
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
   * state[entityId].Position = Position.snapshot(ctx, entityId);
   * ```
   */
  snapshot(ctx: Context, entityId: EntityId): InferComponentType<T> {
    return this._getInstance(ctx).snapshot(entityId);
  }
}

/**
 * Define a new component.
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
 * Singleton descriptor that provides context-aware access to singleton data.
 * Created via defineSingleton().
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
   * Get the component ID in a given Context
   * @internal
   */
  _getComponentId(ctx: Context): number {
    return this._getInstance(ctx).componentId;
  }

  /**
   * Read singleton data (readonly).
   * Returns a bound object with getters that access the underlying buffers.
   * Properties are read-only and reflect the current state.
   *
   * @param ctx - The context containing the singleton instance
   * @returns Readonly object with singleton field values
   *
   * @example
   * ```typescript
   * import { Mouse } from './singletons';
   *
   * function renderSystem(ctx: Context) {
   *   const mouse = Mouse.read(ctx);
   *   console.log(mouse.x, mouse.y); // Access current mouse position
   * }
   * ```
   */
  read(ctx: Context): Readonly<InferComponentType<T>> {
    return this._getInstance(ctx).read(SINGLETON_INDEX);
  }

  /**
   * Write singleton data.
   * Returns a bound object with getters/setters that access the underlying buffers.
   * Automatically triggers a CHANGED event for reactive queries.
   *
   * @param ctx - The context containing the singleton instance
   * @returns Writable object with singleton field getters/setters
   *
   * @example
   * ```typescript
   * import { Time } from './singletons';
   *
   * function timeSystem(ctx: Context) {
   *   const time = Time.write(ctx);
   *   time.delta = performance.now() - time.lastFrame;
   *   time.lastFrame = performance.now();
   * }
   * ```
   */
  write(ctx: Context): InferComponentType<T> {
    return this._getInstance(ctx).write(SINGLETON_INDEX);
  }

  /**
   * Copy data into the singleton.
   * Batch-set multiple fields at once and triggers a CHANGED event.
   * Fields not specified in the data object retain their current values.
   *
   * @param ctx - The context containing the singleton instance
   * @param data - Partial singleton data to copy (unspecified fields keep current values)
   *
   * @example
   * ```typescript
   * import { Mouse } from './singletons';
   *
   * // Set multiple fields at once
   * Mouse.copy(ctx, { x: 100, y: 200, pressed: true });
   *
   * // Useful for initialization
   * Mouse.copy(ctx, { x: 0, y: 0, pressed: false });
   * ```
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
   * @returns Plain object copy of the singleton's field values
   *
   * @example
   * ```typescript
   * import { Mouse } from './singletons';
   *
   * const savedMouse = Mouse.snapshot(ctx);
   * ```
   */
  snapshot(ctx: Context): InferComponentType<T> {
    return this._getInstance(ctx).snapshot(SINGLETON_INDEX);
  }
}

/**
 * Define a new singleton.
 * A singleton is a component with exactly one instance per world.
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
