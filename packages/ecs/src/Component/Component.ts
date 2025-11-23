// TODO
// each component needs to have an unique ID for structurae schema registration
// add migration logic
// add array type
// add object type
// add ComponentInstance.fromJson method

import type { EntityId } from "../World";
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
  type Field,
} from "./fields";

const INITIAL_CAPACITY = 10000;

/**
 * Component class that uses TypedArrays for efficient memory layout
 * Each component has a unique ID and bit position for fast query matching
 */
export class Component<T extends ComponentSchema> {
  readonly bitmask: bigint;
  private schema: Record<string, FieldDef>;
  private fieldNames: string[];

  // Store backing buffers for each numeric field (enables SharedArrayBuffer later)
  private fieldBuffers: Map<string, ArrayBuffer> = new Map();

  // Typed buffer accessor for field access (e.g., Position.buffer.x[eid])
  readonly buffer: ComponentBuffer<T>;

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
  constructor(schema: T, id: number) {
    // Assign unique bit position for bitmask operations
    this.bitmask = 1n << BigInt(id);

    this.schema = {};
    this.fieldNames = [];

    const bufferProxy: any = {};

    // Initialize storage arrays for each field
    for (const [fieldName, builder] of Object.entries(schema)) {
      const fieldDef = builder.def;
      this.schema[fieldName] = fieldDef;
      this.fieldNames.push(fieldName);
      // Get the appropriate handler for this field type
      const field = this.getField(fieldDef.type);
      const { buffer, view } = field.initializeStorage(
        INITIAL_CAPACITY,
        fieldDef
      );

      this.fieldBuffers.set(fieldName, buffer);
      bufferProxy[fieldName] = view;
    }

    this.buffer = bufferProxy as ComponentBuffer<T>;

    // Create master instances with property descriptors for direct buffer access
    this.readonlyMaster = {} as InferComponentType<T>;
    this.writableMaster = {} as InferComponentType<T>;

    // Define getters/setters on master instances for each field
    // Use dynamic references to this.buffer to support array growth
    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      const field = this.getField(fieldDef.type);

      field.defineReadonly(
        this.readonlyMaster,
        fieldName,
        this.buffer,
        () => this.readonlyEntityId
      );
      field.defineWritable(
        this.writableMaster,
        fieldName,
        this.buffer,
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
        fieldDef
      );

      this.fieldBuffers.set(fieldName, buffer);
      (this.buffer as any)[fieldName] = view;
    }
  }
}
