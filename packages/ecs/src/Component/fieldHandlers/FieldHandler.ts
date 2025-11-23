import type { EntityId } from "../../World";
import type { ComponentBuffer } from "../types";

/**
 * Common interface for field type handlers
 * Each field type (string, number, boolean) implements this interface
 */
export interface FieldHandler {
  /**
   * Initialize storage for this field type
   * @param capacity - The initial capacity
   * @param config - Type-specific configuration (e.g., maxLength for strings, btype for numbers)
   * @returns The initialized buffer and backing ArrayBuffer
   */
  initializeStorage(
    capacity: number,
    config: any
  ): { buffer: ArrayBuffer; view: any };

  /**
   * Define readonly property descriptor for this field type
   * @param master - The master object to define the property on
   * @param field - The field name
   * @param buffer - The buffer accessor
   * @param getEntityId - Function to get the current entity ID
   */
  defineReadonly(
    master: any,
    field: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ): void;

  /**
   * Define writable property descriptor for this field type
   * @param master - The master object to define the property on
   * @param field - The field name
   * @param buffer - The buffer accessor
   * @param getEntityId - Function to get the current entity ID
   */
  defineWritable(
    master: any,
    field: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
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

  /**
   * Grow the storage array to accommodate more entities
   * @param oldArray - The old storage array
   * @param newCapacity - The new capacity
   * @param config - Type-specific configuration
   * @returns The new buffer and view
   */
  growStorage(
    oldArray: any,
    newCapacity: number,
    config: any
  ): { buffer: ArrayBuffer; view: any };
}
