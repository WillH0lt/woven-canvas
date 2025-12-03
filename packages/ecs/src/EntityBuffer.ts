import type { EntityId } from "./types";
import type { QueryMasks } from "./types";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

// Metadata buffer layout:
// [0] = length (highest allocated entity index + 1)
const METADATA_LENGTH_INDEX = 0;
const METADATA_SIZE = 1; // Number of Uint32 entries in metadata

export class EntityBuffer {
  private buffer: ArrayBufferLike;
  private metadataBuffer: ArrayBufferLike;
  private view: Uint32Array;
  private metadata: Uint32Array;
  private static readonly ALIVE_MASK = 0x80000000; // Bit 31 (last bit)

  constructor(maxEntities: number) {
    this.buffer = new BufferConstructor(maxEntities * 4);
    this.metadataBuffer = new BufferConstructor(METADATA_SIZE * 4);
    this.view = new Uint32Array(this.buffer);
    this.metadata = new Uint32Array(this.metadataBuffer);
  }

  /**
   * Create an EntityBuffer from shared buffers (for workers)
   * @param buffer - The SharedArrayBuffer for entity data from the main thread
   * @param metadataBuffer - The SharedArrayBuffer for metadata from the main thread
   * @returns A new EntityBuffer wrapping the shared buffers
   */
  static fromTransfer(
    buffer: ArrayBufferLike,
    metadataBuffer: ArrayBufferLike
  ): EntityBuffer {
    const instance = Object.create(EntityBuffer.prototype);
    instance.buffer = buffer;
    instance.metadataBuffer = metadataBuffer;
    instance.view = new Uint32Array(buffer);
    instance.metadata = new Uint32Array(metadataBuffer);
    return instance;
  }

  /**
   * The number of entities the buffer can hold
   */
  get length(): number {
    // metadata[0] stores the highest allocated entity index + 1 for tight iteration bounds
    return this.metadata[METADATA_LENGTH_INDEX];
  }

  /**
   * Get the underlying shared buffer for workers
   * @returns The SharedArrayBuffer that can be shared across threads
   */
  getBuffer(): ArrayBufferLike {
    return this.buffer;
  }

  /**
   * Get the metadata buffer for workers
   * @returns The SharedArrayBuffer for metadata that can be shared across threads
   */
  getMetadataBuffer(): ArrayBufferLike {
    return this.metadataBuffer;
  }

  /**
   * Create a new entity (mark as alive with no components)
   * @param entityId - The entity ID (index in buffer)
   */
  create(entityId: EntityId): void {
    this.view[entityId] = EntityBuffer.ALIVE_MASK;
    this.metadata[METADATA_LENGTH_INDEX] = Math.max(
      this.metadata[METADATA_LENGTH_INDEX],
      entityId + 1
    );
  }

  /**
   * Add a component to an entity
   * @param entityId - The entity ID
   * @param componentMask - The component bitmask to add
   */
  addComponentToEntity(entityId: EntityId, componentMask: number): void {
    this.view[entityId] |= componentMask;
  }

  /**
   * Remove a component from an entity
   * @param entityId - The entity ID
   * @param componentMask - The component bitmask to remove
   */
  removeComponentFromEntity(entityId: EntityId, componentMask: number): void {
    this.view[entityId] &= ~componentMask;
  }

  /**
   * Check if an entity has a specific component
   * @param entityId - The entity ID
   * @param componentMask - The component bitmask to check
   * @returns True if the entity has the component
   */
  hasComponent(entityId: EntityId, componentMask: number): boolean {
    return (this.view[entityId] & componentMask) === componentMask;
  }

  /**
   * Check if an entity matches a component mask (used by queries)
   * @param entityId - The entity ID
   * @param masks - The query masks containing the component criteria
   * @returns True if the entity matches the criteria
   */
  matches(entityId: EntityId, masks: QueryMasks): boolean {
    const value = this.view[entityId];
    if ((value & EntityBuffer.ALIVE_MASK) === 0) {
      return false;
    }

    const withMask = masks.with;
    const withoutMask = masks.without;
    const anyMask = masks.any;

    // Check 'with' criteria
    if (withMask !== 0 && (value & withMask) !== withMask) {
      return false;
    }

    // Check 'without' criteria
    if (withoutMask !== 0 && (value & withoutMask) !== 0) {
      return false;
    }

    // Check 'any' criteria
    if (anyMask !== 0 && (value & anyMask) === 0) {
      return false;
    }

    return true;
  }

  /**
   * Mark an entity as dead (removes it from the buffer)
   * @param entityId - The entity ID to remove
   */
  delete(entityId: EntityId): void {
    this.view[entityId] = 0;
  }

  /**
   * Check if an entity exists and is alive
   * @param entityId - The entity ID to check
   * @returns True if the entity exists and is alive
   */
  has(entityId: EntityId): boolean {
    return (this.view[entityId] & EntityBuffer.ALIVE_MASK) !== 0;
  }
}
