import type { EntityId } from "./types";
import type { QueryMasks } from "./types";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * EntityBuffer manages entity states and their associated components
 * using a compact SharedArrayBuffer layout for efficient cross-thread access.
 *   Entity layout:
 *     [0] = metadata byte (bit 0 = alive, bits 1-7 reserved for future use)
 *     [1...] = component bytes (8 components per byte)
 *
 * Also maintains a separate generation counter array for detecting stale entity refs.
 */
export class EntityBuffer {
  private buffer: ArrayBufferLike;
  private view: Uint8Array;
  private readonly bytesPerEntity: number;

  // Metadata byte layout:
  // - Bit 0: alive flag
  // - Bits 1-7: generation counter (0-127, wraps around)
  private static readonly ALIVE_FLAG = 0x01;
  private static readonly GENERATION_MASK = 0xfe; // Bits 1-7
  private static readonly GENERATION_SHIFT = 1;

  /**
   * Create a new EntityBuffer
   * @param maxEntities - Maximum number of entities
   * @param componentCount - Number of components (determines bytes needed per entity)
   */
  constructor(maxEntities: number, componentCount: number) {
    // 1 byte for metadata + ceil(componentCount / 8) bytes for component bits
    const componentBytes = Math.ceil(componentCount / 8);
    this.bytesPerEntity = 1 + componentBytes;

    const totalBytes = maxEntities * this.bytesPerEntity;
    this.buffer = new BufferConstructor(totalBytes);
    this.view = new Uint8Array(this.buffer);
  }

  /**
   * Create an EntityBuffer from a shared buffer (for workers)
   * @param buffer - The SharedArrayBuffer for entity data from the main thread
   * @param componentCount - Number of components (must match the original buffer)
   * @returns A new EntityBuffer wrapping the shared buffer
   */
  static fromTransfer(
    buffer: ArrayBufferLike,
    componentCount: number
  ): EntityBuffer {
    const instance = Object.create(EntityBuffer.prototype);
    instance.buffer = buffer;
    instance.view = new Uint8Array(buffer);
    const componentBytes = Math.ceil(componentCount / 8);
    instance.bytesPerEntity = 1 + componentBytes;
    return instance;
  }

  /**
   * Get the underlying shared buffer for workers
   * @returns The SharedArrayBuffer that can be shared across threads
   */
  getBuffer(): ArrayBufferLike {
    return this.buffer;
  }

  /**
   * Create a new entity (mark as alive with no components)
   * Increments the generation counter to invalidate any stale refs.
   * @param entityId - The entity ID (index in buffer, must be >= 0)
   */
  create(entityId: EntityId): void {
    const offset = entityId * this.bytesPerEntity;
    const view = this.view;
    const bytesPerEntity = this.bytesPerEntity;

    // Get current generation and increment it (wraps at 128)
    const oldMetadata = view[offset];
    const oldGeneration =
      (oldMetadata & EntityBuffer.GENERATION_MASK) >>
      EntityBuffer.GENERATION_SHIFT;
    const newGeneration = (oldGeneration + 1) & 0x7f; // 7 bits = 0-127

    // Clear all bytes for this entity
    for (let i = 0; i < bytesPerEntity; i++) {
      view[offset + i] = 0;
    }
    // Set alive flag and new generation in metadata byte
    view[offset] =
      EntityBuffer.ALIVE_FLAG |
      (newGeneration << EntityBuffer.GENERATION_SHIFT);
  }

  /**
   * Add a component to an entity
   * @param entityId - The entity ID
   * @param componentId - The component ID (0 to componentCount-1)
   */
  addComponentToEntity(entityId: EntityId, componentId: number): void {
    // Component bits start at byte 1 (byte 0 is metadata)
    // componentId 0-7 -> byte 1, componentId 8-15 -> byte 2, etc.
    const byteIndex = 1 + (componentId >> 3);
    const bitIndex = componentId & 7;
    const offset = entityId * this.bytesPerEntity;
    this.view[offset + byteIndex] |= 1 << bitIndex;
  }

  /**
   * Remove a component from an entity
   * @param entityId - The entity ID
   * @param componentId - The component ID (0 to componentCount-1)
   */
  removeComponentFromEntity(entityId: EntityId, componentId: number): void {
    const byteIndex = 1 + (componentId >> 3);
    const bitIndex = componentId & 7;
    const offset = entityId * this.bytesPerEntity;
    this.view[offset + byteIndex] &= ~(1 << bitIndex);
  }

  /**
   * Check if an entity has a specific component
   * @param entityId - The entity ID
   * @param componentId - The component ID (0 to componentCount-1)
   * @returns True if the entity has the component
   */
  hasComponent(entityId: EntityId, componentId: number): boolean {
    const byteIndex = 1 + (componentId >> 3);
    const bitIndex = componentId & 7;
    const offset = entityId * this.bytesPerEntity;
    return (this.view[offset + byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Check if an entity matches a component mask (used by queries)
   * @param entityId - The entity ID
   * @param masks - The query masks containing the component criteria
   * @returns True if the entity matches the criteria
   */
  matches(entityId: EntityId, masks: QueryMasks): boolean {
    const bytesPerEntity = this.bytesPerEntity;
    const offset = entityId * bytesPerEntity;
    const view = this.view;

    // Check if alive (bit 0 of metadata byte)
    if ((view[offset] & EntityBuffer.ALIVE_FLAG) === 0) {
      return false;
    }

    // Component bytes start at offset + 1
    const componentOffset = offset + 1;

    // Check 'with' criteria - entity must have ALL specified components
    if (masks.hasWith) {
      const withMask = masks.with;
      const maskLength = withMask.length;
      for (let i = 0; i < maskLength; i++) {
        const mask = withMask[i];
        if (mask !== 0) {
          const value = view[componentOffset + i];
          if ((value & mask) !== mask) {
            return false;
          }
        }
      }
    }

    // Check 'without' criteria - entity must have NONE of the specified components
    if (masks.hasWithout) {
      const withoutMask = masks.without;
      const maskLength = withoutMask.length;
      for (let i = 0; i < maskLength; i++) {
        const mask = withoutMask[i];
        if (mask !== 0) {
          const value = view[componentOffset + i];
          if ((value & mask) !== 0) {
            return false;
          }
        }
      }
    }

    // Check 'any' criteria - entity must have AT LEAST ONE of the specified components
    if (masks.hasAny) {
      const anyMask = masks.any;
      const maskLength = anyMask.length;
      let foundAny = false;
      for (let i = 0; i < maskLength; i++) {
        const mask = anyMask[i];
        if (mask !== 0) {
          const value = view[componentOffset + i];
          if ((value & mask) !== 0) {
            foundAny = true;
            break;
          }
        }
      }
      if (!foundAny) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark an entity as dead (clears all data including component bits)
   * @param entityId - The entity ID to remove
   */
  delete(entityId: EntityId): void {
    const offset = entityId * this.bytesPerEntity;
    const view = this.view;
    const bytesPerEntity = this.bytesPerEntity;
    for (let i = 0; i < bytesPerEntity; i++) {
      view[offset + i] = 0;
    }
  }

  /**
   * Mark an entity as dead but preserve component data.
   * This allows .removed() queries to still read component values.
   * The entity will no longer match any queries (alive check fails).
   * @param entityId - The entity ID to mark as dead
   */
  markDead(entityId: EntityId): void {
    const offset = entityId * this.bytesPerEntity;
    // Clear only the alive flag, preserve component bits
    this.view[offset] &= ~EntityBuffer.ALIVE_FLAG;
  }

  /**
   * Check if an entity exists and is alive
   * @param entityId - The entity ID to check
   * @returns True if the entity exists and is alive
   */
  has(entityId: EntityId): boolean {
    const offset = entityId * this.bytesPerEntity;
    return (this.view[offset] & EntityBuffer.ALIVE_FLAG) !== 0;
  }

  /**
   * Get the generation counter for an entity slot.
   * Used by ref fields to detect stale references after entity recycling.
   * @param entityId - The entity ID
   * @returns The generation counter (0-127)
   */
  getGeneration(entityId: EntityId): number {
    const offset = entityId * this.bytesPerEntity;
    return (
      (this.view[offset] & EntityBuffer.GENERATION_MASK) >>
      EntityBuffer.GENERATION_SHIFT
    );
  }
}
