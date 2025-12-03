import type { EntityId } from "./types";
import type { QueryMasks } from "./types";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * EntityBuffer manages entity states and their associated components
 * using a compact SharedArrayBuffer layout for efficient cross-thread access.
 *   Buffer layout:
 *     [0...3] = length as Uint32 (highest allocated entity index + 1)
 *     [4...] = entity data, each entity has `bytesPerEntity` bytes
 *   Entity layout:
 *     [0] = metadata byte (bit 0 = alive, bits 1-7 reserved for future use)
 *     [1...] = component bytes (8 components per byte)
 */
export class EntityBuffer {
  private buffer: ArrayBufferLike;
  private view: Uint8Array;
  private lengthView: Uint32Array; // For atomic length access
  private readonly bytesPerEntity: number;

  // Metadata byte flags
  private static readonly ALIVE_FLAG = 0x01; // Bit 0 of metadata byte

  /**
   * Create a new EntityBuffer
   * @param maxEntities - Maximum number of entities
   * @param componentCount - Number of components (determines bytes needed per entity)
   */
  constructor(maxEntities: number, componentCount: number) {
    // 1 byte for metadata + ceil(componentCount / 8) bytes for component bits
    const componentBytes = Math.ceil(componentCount / 8);
    this.bytesPerEntity = 1 + componentBytes;

    // 4 bytes for length + entity data
    const totalBytes = 4 + maxEntities * this.bytesPerEntity;
    this.buffer = new BufferConstructor(totalBytes);
    this.view = new Uint8Array(this.buffer);
    this.lengthView = new Uint32Array(this.buffer, 0, 1);
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
    instance.lengthView = new Uint32Array(buffer, 0, 1);
    const componentBytes = Math.ceil(componentCount / 8);
    instance.bytesPerEntity = 1 + componentBytes;
    return instance;
  }

  /**
   * Get the base byte offset for a given entity
   */
  private getEntityOffset(entityId: EntityId): number {
    // Skip 4 bytes for length, then entityId * bytesPerEntity
    return 4 + entityId * this.bytesPerEntity;
  }

  /**
   * The number of entities the buffer can hold (highest allocated entity index + 1)
   */
  get length(): number {
    return this.lengthView[0];
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
   * @param entityId - The entity ID (index in buffer, must be >= 0)
   */
  create(entityId: EntityId): void {
    const offset = this.getEntityOffset(entityId);
    // Clear all bytes for this entity
    for (let i = 0; i < this.bytesPerEntity; i++) {
      this.view[offset + i] = 0;
    }
    // Set alive flag in metadata byte
    this.view[offset] = EntityBuffer.ALIVE_FLAG;
    // Update length
    if (entityId + 1 > this.lengthView[0]) {
      this.lengthView[0] = entityId + 1;
    }
  }

  /**
   * Add a component to an entity
   * @param entityId - The entity ID
   * @param componentId - The component ID (0 to componentCount-1)
   */
  addComponentToEntity(entityId: EntityId, componentId: number): void {
    // Component bits start at byte 1 (byte 0 is metadata)
    // componentId 0-7 -> byte 1, componentId 8-15 -> byte 2, etc.
    const byteIndex = 1 + Math.floor(componentId / 8);
    const bitIndex = componentId % 8;
    const offset = this.getEntityOffset(entityId);
    this.view[offset + byteIndex] |= 1 << bitIndex;
  }

  /**
   * Remove a component from an entity
   * @param entityId - The entity ID
   * @param componentId - The component ID (0 to componentCount-1)
   */
  removeComponentFromEntity(entityId: EntityId, componentId: number): void {
    const byteIndex = 1 + Math.floor(componentId / 8);
    const bitIndex = componentId % 8;
    const offset = this.getEntityOffset(entityId);
    this.view[offset + byteIndex] &= ~(1 << bitIndex);
  }

  /**
   * Check if an entity has a specific component
   * @param entityId - The entity ID
   * @param componentId - The component ID (0 to componentCount-1)
   * @returns True if the entity has the component
   */
  hasComponent(entityId: EntityId, componentId: number): boolean {
    const byteIndex = 1 + Math.floor(componentId / 8);
    const bitIndex = componentId % 8;
    const offset = this.getEntityOffset(entityId);
    return (this.view[offset + byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Check if an entity matches a component mask (used by queries)
   * @param entityId - The entity ID
   * @param masks - The query masks containing the component criteria
   * @returns True if the entity matches the criteria
   */
  matches(entityId: EntityId, masks: QueryMasks): boolean {
    const offset = this.getEntityOffset(entityId);

    // Check if alive (bit 0 of metadata byte)
    if ((this.view[offset] & EntityBuffer.ALIVE_FLAG) === 0) {
      return false;
    }

    const withMask = masks.with;
    const withoutMask = masks.without;
    const anyMask = masks.any;

    // Component bytes start at offset + 1
    const componentOffset = offset + 1;

    // Check 'with' criteria - entity must have ALL specified components
    for (let i = 0; i < withMask.length; i++) {
      const mask = withMask[i];
      if (mask !== 0) {
        const value = this.view[componentOffset + i];
        if ((value & mask) !== mask) {
          return false;
        }
      }
    }

    // Check 'without' criteria - entity must have NONE of the specified components
    for (let i = 0; i < withoutMask.length; i++) {
      const mask = withoutMask[i];
      if (mask !== 0) {
        const value = this.view[componentOffset + i];
        if ((value & mask) !== 0) {
          return false;
        }
      }
    }

    // Check 'any' criteria - entity must have AT LEAST ONE of the specified components
    let hasAny = false;
    let anySpecified = false;
    for (let i = 0; i < anyMask.length; i++) {
      const mask = anyMask[i];
      if (mask !== 0) {
        anySpecified = true;
        const value = this.view[componentOffset + i];
        if ((value & mask) !== 0) {
          hasAny = true;
          break;
        }
      }
    }
    if (anySpecified && !hasAny) {
      return false;
    }

    return true;
  }

  /**
   * Mark an entity as dead (removes it from the buffer)
   * @param entityId - The entity ID to remove
   */
  delete(entityId: EntityId): void {
    const offset = this.getEntityOffset(entityId);
    for (let i = 0; i < this.bytesPerEntity; i++) {
      this.view[offset + i] = 0;
    }
  }

  /**
   * Check if an entity exists and is alive
   * @param entityId - The entity ID to check
   * @returns True if the entity exists and is alive
   */
  has(entityId: EntityId): boolean {
    const offset = this.getEntityOffset(entityId);
    return (this.view[offset] & EntityBuffer.ALIVE_FLAG) !== 0;
  }
}
