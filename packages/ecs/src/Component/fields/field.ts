import type { EntityId } from "../../types";
import type { ComponentBuffer } from "../types";

/**
 * Common interface for field type handlers
 * Each field type (string, number, boolean) implements this interface
 */
export interface Field {
  /**
   * Initialize storage for this field type
   * @param capacity - The initial capacity
   * @param config - Type-specific configuration (e.g., maxLength for strings, btype for numbers)
   * @param BufferConstructor - The buffer constructor (SharedArrayBuffer or ArrayBuffer)
   * @returns The initialized buffer and backing ArrayBufferLike
   */
  initializeStorage(
    capacity: number,
    config: any,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ): { buffer: ArrayBufferLike; view: any };

  /**
   * Define readonly property descriptor for this field type
   * @param master - The master object to define the property on
   * @param field - The field name
   * @param buffer - The buffer accessor
   * @param getEntityId - Function to get the current entity ID
   * @param fieldDef - Optional field definition (used by enum fields for value mapping)
   */
  defineReadonly(
    master: any,
    field: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId,
    fieldDef?: any
  ): void;

  /**
   * Define writable property descriptor for this field type
   * @param master - The master object to define the property on
   * @param field - The field name
   * @param buffer - The buffer accessor
   * @param getEntityId - Function to get the current entity ID
   * @param fieldDef - Optional field definition (used by enum fields for value mapping)
   */
  defineWritable(
    master: any,
    field: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId,
    fieldDef?: any
  ): void;

  /**
   * Get the default value for this field type
   * @param fieldDef - The field definition
   * @returns The default value
   */
  getDefaultValue(fieldDef: any): any;

  /**
   * Set a value in the storage
   * @param array - The storage array
   * @param entityId - The entity ID
   * @param value - The value to set
   */
  setValue(array: any, entityId: EntityId, value: any): void;
}
