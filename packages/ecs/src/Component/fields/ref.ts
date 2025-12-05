import type { EntityId } from "../../types";
import type { ComponentBuffer, RefFieldDef } from "../types";
import { Field, type FieldOptions, type IsEntityAlive } from "./field";

/**
 * Sentinel value representing a null reference.
 * Uses max uint32 value which will never be a valid entity ID.
 */
export const NULL_REF = 0xffffffff;

/**
 * RefField handler for entity reference fields.
 * Uses 4 bytes per entity, NULL_REF (0xFFFFFFFF) represents null/no reference.
 * Uses lazy validation: refs to dead entities are auto-nullified on read.
 */
export class RefField extends Field<RefFieldDef> {
  private readonly isEntityAlive: IsEntityAlive;

  constructor(fieldDef: RefFieldDef, options?: FieldOptions) {
    super(fieldDef, options);
    if (!options?.isEntityAlive) {
      throw new Error("RefField requires isEntityAlive in options");
    }
    this.isEntityAlive = options.isEntityAlive;
  }

  initializeStorage(
    capacity: number,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const buffer = new BufferConstructor(capacity * 4);
    const view = new Uint32Array(buffer);
    // Initialize all refs to null
    view.fill(NULL_REF);
    return { buffer, view };
  }

  defineReadonly(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    const isEntityAlive = this.isEntityAlive;

    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[fieldName] as Uint32Array;
        const value = array[getEntityId()];
        if (value === NULL_REF) {
          return null;
        }
        // Lazy validation: check if referenced entity is still alive
        if (!isEntityAlive(value)) {
          // Auto-nullify the dead reference using atomic store for thread safety
          Atomics.store(array, getEntityId(), NULL_REF);
          return null;
        }
        return value;
      },
    });
  }

  defineWritable(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    const isEntityAlive = this.isEntityAlive;

    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[fieldName] as Uint32Array;
        const value = array[getEntityId()];
        if (value === NULL_REF) {
          return null;
        }
        // Lazy validation: check if referenced entity is still alive
        if (!isEntityAlive(value)) {
          // Auto-nullify the dead reference using atomic store for thread safety
          Atomics.store(array, getEntityId(), NULL_REF);
          return null;
        }
        return value;
      },
      set: (value: EntityId | null) => {
        const array = (buffer as any)[fieldName] as Uint32Array;
        array[getEntityId()] = value ?? NULL_REF;
      },
    });
  }

  getDefaultValue() {
    // Refs default to null (stored as NULL_REF)
    return NULL_REF;
  }

  setValue(array: Uint32Array, entityId: EntityId, value: EntityId | null) {
    array[entityId] = value ?? NULL_REF;
  }
}
