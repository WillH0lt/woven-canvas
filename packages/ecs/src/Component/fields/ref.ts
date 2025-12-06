import type { EntityId } from "../../types";
import type { EntityBuffer } from "../../EntityBuffer";
import type { ComponentBuffer, RefFieldDef } from "../types";
import { Field } from "./field";

/**
 * Sentinel value representing a null reference.
 * Uses max uint32 value which will never be a valid packed ref.
 */
export const NULL_REF = 0xffffffff;

/**
 * Ref packing layout (32-bit):
 * - Bits 0-24: entity ID (supports up to 33 million entities)
 * - Bits 25-31: generation (7 bits = 0-127, matches EntityBuffer)
 */
const ENTITY_ID_MASK = 0x01ffffff; // 25 bits
const GENERATION_SHIFT = 25;

/**
 * Pack an entity ID and generation into a 32-bit ref value.
 */
function packRef(entityId: EntityId, generation: number): number {
  return (entityId & ENTITY_ID_MASK) | (generation << GENERATION_SHIFT);
}

/**
 * Unpack entity ID from a 32-bit ref value.
 */
function unpackEntityId(ref: number): EntityId {
  return ref & ENTITY_ID_MASK;
}

/**
 * Unpack generation from a 32-bit ref value.
 */
function unpackGeneration(ref: number): number {
  return ref >>> GENERATION_SHIFT;
}

/**
 * RefField handler for entity reference fields.
 * Uses 4 bytes per entity storing packed (entityId + generation).
 * NULL_REF (0xFFFFFFFF) represents null/no reference.
 * Uses lazy validation: refs to dead/recycled entities are auto-nullified on read.
 */
export class RefField extends Field<RefFieldDef> {
  private readonly entityBuffer: EntityBuffer;

  constructor(fieldDef: RefFieldDef, entityBuffer: EntityBuffer) {
    super(fieldDef);
    this.entityBuffer = entityBuffer;
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
    const entityBuffer = this.entityBuffer;

    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = buffer[fieldName] as Uint32Array;
        const packedRef = Atomics.load(array, getEntityId());
        if (packedRef === NULL_REF) {
          return null;
        }

        const refEntityId = unpackEntityId(packedRef);
        const refGeneration = unpackGeneration(packedRef);

        // Lazy validation: check if ref is still valid (alive + generation matches)
        if (
          !entityBuffer.has(refEntityId) ||
          entityBuffer.getGeneration(refEntityId) !== refGeneration
        ) {
          // Auto-nullify the stale reference using atomic store for thread safety
          Atomics.store(array, getEntityId(), NULL_REF);
          return null;
        }
        return refEntityId;
      },
    });
  }

  defineWritable(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    const entityBuffer = this.entityBuffer;

    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = buffer[fieldName] as Uint32Array;
        const packedRef = Atomics.load(array, getEntityId());
        if (packedRef === NULL_REF) {
          return null;
        }

        const refEntityId = unpackEntityId(packedRef);
        const refGeneration = unpackGeneration(packedRef);

        // Lazy validation: check if ref is still valid (alive + generation matches)
        if (
          !entityBuffer.has(refEntityId) ||
          entityBuffer.getGeneration(refEntityId) !== refGeneration
        ) {
          // Auto-nullify the stale reference using atomic store for thread safety
          Atomics.store(array, getEntityId(), NULL_REF);
          return null;
        }
        return refEntityId;
      },
      set: (value: EntityId | null) => {
        const array = buffer[fieldName] as Uint32Array;
        if (value === null) {
          Atomics.store(array, getEntityId(), NULL_REF);
        } else {
          // Pack the entity ID with its current generation
          const generation = entityBuffer.getGeneration(value);
          Atomics.store(array, getEntityId(), packRef(value, generation));
        }
      },
    });
  }

  getDefaultValue() {
    // Refs default to null (stored as NULL_REF)
    return NULL_REF;
  }

  setValue(array: Uint32Array, entityId: EntityId, value: EntityId | null) {
    if (value === null || value === NULL_REF) {
      Atomics.store(array, entityId, NULL_REF);
    } else {
      // Pack the entity ID with its current generation
      const generation = this.entityBuffer.getGeneration(value);
      Atomics.store(array, entityId, packRef(value, generation));
    }
  }
}
