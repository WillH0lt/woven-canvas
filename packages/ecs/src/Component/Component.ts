// TODO
// each component needs to have an unique ID for structurae schema registration
// add migration logic
// add array type
// add object type
// add ComponentInstance.fromJson method

import type { EntityId } from "../types";
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
  type Field,
} from "./fields";

const INITIAL_CAPACITY = 10000;

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * Component class that uses TypedArrays for efficient memory layout
 * Each component has a unique ID and bit position for fast query matching
 */
export abstract class Component<T extends ComponentSchema> {
  bitmask: number = 0;
  private _initialized: boolean = false;

  private schema: Record<string, FieldDef>;
  private fieldNames: string[];

  // Store backing buffers for each field (uses SharedArrayBuffer when available)
  private fieldBuffers: Map<string, ArrayBufferLike> = new Map();

  // Typed buffer accessor for field access (e.g., Position.buffer.x[eid])
  private _buffer: ComponentBuffer<T> | null = null;

  // Binding instances - master objects with getters/setters
  private readonly readonlyMaster: InferComponentType<T>;
  private readonly writableMaster: InferComponentType<T>;

  // Current bound entity state
  private readonlyEntityId: EntityId = 0;
  private writableEntityId: EntityId = 0;

  /**
   * Create a new component definition
   * @param schema - The component schema built using field builders
   * @param id - The unique index assigned by World
   */
  constructor(schema: T) {
    this.schema = {};
    this.fieldNames = [];

    // Initialize storage arrays for each field
    for (const [fieldName, builder] of Object.entries(schema)) {
      const fieldDef = builder.def;
      this.schema[fieldName] = fieldDef;
      this.fieldNames.push(fieldName);
    }

    // Create master instances with property descriptors for direct buffer access
    this.readonlyMaster = {} as InferComponentType<T>;
    this.writableMaster = {} as InferComponentType<T>;
  }

  initialize(id: number): void {
    // Guard against double initialization
    if (this._initialized) {
      throw new Error(
        `Component has already been initialized. ` +
          `Each component instance can only be registered with one World. ` +
          `If you need multiple worlds, define separate component instances for each.`
      );
    }
    this._initialized = true;

    // Assign unique bit position for bitmask operations (supports up to 31 components)
    if (id >= 31) {
      throw new Error(`Component ID ${id} exceeds maximum of 31 components`);
    }
    this.bitmask = 1 << id;

    const bufferProxy: any = {};

    // Initialize storage arrays for each field
    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      // Get the appropriate handler for this field type
      const field = this.getField(fieldDef.type);
      const { buffer, view } = field.initializeStorage(
        INITIAL_CAPACITY,
        fieldDef,
        BufferConstructor
      );

      this.fieldBuffers.set(fieldName, buffer);
      bufferProxy[fieldName] = view;
    }

    this._buffer = bufferProxy as ComponentBuffer<T>;

    this.initializeMasters();
  }

  public get buffer(): ComponentBuffer<T> {
    return this._buffer as ComponentBuffer<T>;
  }

  /**
   * Initialize component in a worker context with transferred buffers
   * @param id - The component ID
   * @param bitmask - The component bitmask
   * @param buffer - The transferred buffer object containing typed arrays
   * @internal
   */
  fromTransfer(bitmask: number, buffer: ComponentBuffer<T>): void {
    if (this._initialized) {
      throw new Error(`Component has already been initialized.`);
    }
    this._initialized = true;
    this.bitmask = bitmask;
    this._buffer = buffer;
    this.initializeMasters();
  }

  private initializeMasters(): void {
    if (this._buffer === null) {
      throw new Error("Component buffers not initialized");
    }

    // Define getters/setters on master instances for each field
    // Use dynamic references to this.buffer to support array growth
    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      const field = this.getField(fieldDef.type);

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
    // Ensure capacity first
    const firstField = this.fieldNames[0];
    if (firstField) {
      const firstArray = (this.buffer as any)[firstField];
      if (firstArray && entityId >= firstArray.length) {
        this.growArrays(entityId + 1);
      }
    }

    // Populate each field's storage array using cached field names
    for (let i = 0; i < this.fieldNames.length; i++) {
      const fieldName = this.fieldNames[i];
      const array = (this.buffer as any)[fieldName];
      const fieldDef = this.schema[fieldName];
      const field = this.getField(fieldDef.type);

      // Get value from input data or use default
      const value =
        data && fieldName in data
          ? data[fieldName]
          : field.getDefaultValue(fieldDef);
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
   * @param entityId - The entity ID to write to
   * @returns The writable master object for reading and writing component fields
   */
  write(entityId: EntityId): InferComponentType<T> {
    this.writableEntityId = entityId;
    return this.writableMaster;
  }

  /**
   * Grow all storage arrays to accommodate more entities
   * @param minCapacity - The minimum required capacity
   * @internal
   */
  private growArrays(minCapacity: number): void {
    const firstField = this.fieldNames[0];
    const firstArray = firstField ? (this.buffer as any)[firstField] : null;
    const currentCapacity = firstArray ? firstArray.length : INITIAL_CAPACITY;
    const newCapacity = Math.max(minCapacity, currentCapacity * 2);

    for (const fieldName of this.fieldNames) {
      const oldArray = (this.buffer as any)[fieldName];
      const fieldDef = this.schema[fieldName];
      const field = this.getField(fieldDef.type);

      const { buffer, view } = field.growStorage(
        oldArray,
        newCapacity,
        fieldDef,
        BufferConstructor
      );

      this.fieldBuffers.set(fieldName, buffer);
      (this.buffer as any)[fieldName] = view;
    }
  }
}

/**
 * Define a component with a name and schema.
 * This creates a component instance that can be registered with a World.
 * Each component instance is tied to a single World.
 *
 * @template T - The component schema type
 * @param name - The name of the component (e.g., "Position", "Velocity")
 * @param schema - The component schema built using field builders
 * @returns A component instance that extends Component<T>
 *
 * @example
 * ```typescript
 * import { field, defineComponent } from "@infinitecanvas/ecs";
 *
 * export const Position = defineComponent({
 *   x: field.float32(),
 *   y: field.float32(),
 * });
 *
 * export const Velocity = defineComponent({
 *   x: field.float32(),
 *   y: field.float32(),
 * });
 *
 * // Use in World registration
 * import * as components from "./components";
 * const world = new World(components);
 *
 * // Adding components to entities
 * world.addComponent(entity, components.Position, { x: 0, y: 0 });
 *
 * // Reading component data
 * const position = components.Position.read(entityId);
 *
 * // In queries (in workers)
 * const entities = query(ctx, (q) => q.with(components.Position));
 * ```
 */
export function defineComponent<T extends ComponentSchema>(
  schema: T
): Component<T> {
  class DefinedComponent extends Component<T> {
    constructor() {
      super(schema);
    }
  }

  return new DefinedComponent();
}
