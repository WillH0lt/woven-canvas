import type { EntityId } from "./types";
import type { QueryMasks } from "./types";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

export class EntityBufferView {
  private buffer: ArrayBufferLike;
  private view: Uint32Array;
  private static readonly ALIVE_MASK = 0x80000000; // Bit 31 (last bit)
  private _count = 0;

  constructor() {
    this.buffer = new BufferConstructor(3200); // 100 entities * 4 bytes each
    this.view = new Uint32Array(this.buffer);
  }

  /**
   * Create an EntityBufferView from a shared buffer (for workers)
   * @param buffer - The SharedArrayBuffer from the main thread
   * @returns A new EntityBufferView wrapping the shared buffer
   */
  static fromTransfer(buffer: ArrayBufferLike): EntityBufferView {
    const instance = Object.create(EntityBufferView.prototype);
    instance.buffer = buffer;
    instance.view = new Uint32Array(buffer);
    return instance;
  }

  /**
   * Get the number of entities in the buffer, alive or dead
   */
  get count(): number {
    return this._count;
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
   * @param entityId - The entity ID (index in buffer)
   */
  create(entityId: EntityId): void {
    this.view[entityId] = EntityBufferView.ALIVE_MASK;
    this._count = Math.max(this._count, entityId + 1);
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
    if ((value & EntityBufferView.ALIVE_MASK) === 0) {
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
    return (this.view[entityId] & EntityBufferView.ALIVE_MASK) !== 0;
  }
}
