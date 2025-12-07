import type { EntityId } from "./types";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * Event types for the ring buffer (bitmask values for fast filtering)
 */
export const EventType = {
  ADDED: 1 << 0, // 1 - Entity added to world
  REMOVED: 1 << 1, // 2 - Entity removed from world
  CHANGED: 1 << 2, // 4 - Component data changed
  COMPONENT_ADDED: 1 << 3, // 8 - Component added to existing entity
  COMPONENT_REMOVED: 1 << 4, // 16 - Component removed from existing entity
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

/**
 * Pre-computed bitmasks for common query operations
 */
export const EventTypeMask = {
  /** Events that can cause an entity to be added to a query result (entity added, or component added/removed changing match) */
  QUERY_ADDED:
    EventType.ADDED | EventType.COMPONENT_ADDED | EventType.COMPONENT_REMOVED,
  /** Events that can cause an entity to be removed from a query result (entity removed, or component added/removed changing match) */
  QUERY_REMOVED:
    EventType.REMOVED | EventType.COMPONENT_ADDED | EventType.COMPONENT_REMOVED,
  /** All event types */
  ALL:
    EventType.ADDED |
    EventType.REMOVED |
    EventType.CHANGED |
    EventType.COMPONENT_ADDED |
    EventType.COMPONENT_REMOVED,
} as const;

export type EventTypeMaskValue =
  (typeof EventTypeMask)[keyof typeof EventTypeMask];

/**
 * Event structure (8 bytes per event):
 *   [0..3]  entityId (u32) - which entity
 *   [4]     eventType (u8) - ADDED, REMOVED, or CHANGED
 *   [5]     padding (u8) - alignment padding
 *   [6..7]  componentId (u16) - which component (for CHANGED events)
 */
const BYTES_PER_EVENT = 8;

/**
 * Header layout:
 *   [0..3]  writeIndex (u32, atomic) - next write position (wraps around)
 */
const HEADER_SIZE = 4;
const WRITE_INDEX_OFFSET = 0;

/**
 * EventBuffer implements a lock-free ring buffer for entity events.
 * Events are written atomically and can be read from any thread.
 *
 * Used for tracking:
 * - Entity creation (ADDED)
 * - Entity deletion (REMOVED)
 * - Component changes (CHANGED)
 */
export class EventBuffer {
  private buffer: ArrayBufferLike;
  private headerView: Uint32Array;
  private dataView: Uint32Array; // Each event is 2 Uint32s (8 bytes)
  private readonly maxEvents: number;
  private readonly reusableSet: Set<number> = new Set();

  /**
   * Create a new EventBuffer
   * @param maxEvents - Maximum number of events to store (ring buffer wraps)
   */
  constructor(maxEvents: number) {
    this.maxEvents = maxEvents;
    const totalBytes = HEADER_SIZE + maxEvents * BYTES_PER_EVENT;
    this.buffer = new BufferConstructor(totalBytes);
    this.headerView = new Uint32Array(this.buffer, 0, 1);
    // Each event is 2 Uint32s, starting after the header
    this.dataView = new Uint32Array(this.buffer, HEADER_SIZE);

    // Initialize header atomically
    Atomics.store(this.headerView, WRITE_INDEX_OFFSET, 0);
  }

  /**
   * Create an EventBuffer from a shared buffer (for workers)
   * @param buffer - The SharedArrayBuffer from the main thread
   * @param maxEvents - Maximum number of events (must match the original buffer)
   * @returns A new EventBuffer wrapping the shared buffer
   */
  static fromTransfer(buffer: ArrayBufferLike, maxEvents: number): EventBuffer {
    const instance = Object.create(EventBuffer.prototype);
    instance.buffer = buffer;
    instance.headerView = new Uint32Array(buffer, 0, 1);
    instance.dataView = new Uint32Array(buffer, HEADER_SIZE);
    instance.maxEvents = maxEvents;
    instance.reusableSet = new Set<number>();
    return instance;
  }

  /**
   * Get the underlying buffer for transfer to workers
   */
  getBuffer(): ArrayBufferLike {
    return this.buffer;
  }

  /**
   * Push an event to the ring buffer (thread-safe)
   * @param entityId - The entity ID
   * @param eventType - The type of event (ADDED, REMOVED, CHANGED)
   * @param componentId - The component ID (for CHANGED events, 0 otherwise)
   */
  push(
    entityId: EntityId,
    eventType: EventTypeValue,
    componentId: number = 0
  ): void {
    // Atomically get and increment write index
    const index =
      Atomics.add(this.headerView, WRITE_INDEX_OFFSET, 1) % this.maxEvents;

    // Each event is 2 Uint32 elements in the dataView array
    // Event layout in Uint32 terms:
    //   [index*2]   = entityId (u32)
    //   [index*2+1] = eventType (u8) | padding (u8) | componentId (u16) packed as u32
    const dataIndex = index * 2;

    // Write event data atomically
    // Pack eventType and componentId into second u32 (little-endian layout)
    // Bytes: [eventType, padding, componentId low, componentId high]
    const packedData = eventType | (componentId << 16);

    Atomics.store(this.dataView, dataIndex, entityId);
    Atomics.store(this.dataView, dataIndex + 1, packedData);
  }

  /**
   * Push an ADDED event
   */
  pushAdded(entityId: EntityId): void {
    this.push(entityId, EventType.ADDED, 0);
  }

  /**
   * Push a REMOVED event
   */
  pushRemoved(entityId: EntityId): void {
    this.push(entityId, EventType.REMOVED, 0);
  }

  /**
   * Push a CHANGED event for a specific component
   */
  pushChanged(entityId: EntityId, componentId: number): void {
    this.push(entityId, EventType.CHANGED, componentId);
  }

  /**
   * Push a COMPONENT_ADDED event when a component is added to an existing entity
   */
  pushComponentAdded(entityId: EntityId, componentId: number): void {
    this.push(entityId, EventType.COMPONENT_ADDED, componentId);
  }

  /**
   * Push a COMPONENT_REMOVED event when a component is removed from an existing entity
   */
  pushComponentRemoved(entityId: EntityId, componentId: number): void {
    this.push(entityId, EventType.COMPONENT_REMOVED, componentId);
  }

  /**
   * Read an event at a specific index
   * @param index - The index in the ring buffer (0 to maxEvents-1)
   * @returns The event data
   */
  readEvent(index: number): {
    entityId: number;
    eventType: EventTypeValue;
    componentId: number;
  } {
    const dataIndex = index * 2;

    const entityId = Atomics.load(this.dataView, dataIndex);
    const packedData = Atomics.load(this.dataView, dataIndex + 1);

    return {
      entityId,
      eventType: (packedData & 0xff) as EventTypeValue,
      componentId: (packedData >> 16) & 0xffff,
    };
  }

  /**
   * Get the current write index (for debugging/testing)
   */
  getWriteIndex(): number {
    return Atomics.load(this.headerView, WRITE_INDEX_OFFSET);
  }

  /**
   * Collect entity IDs from events in a range directly into a Set.
   * Optimized version that avoids the generator overhead.
   *
   * @param lastIndex - The last index this caller scanned (will be updated)
   * @param eventTypes - Bitmask of event types to include (e.g., EventType.ADDED | EventType.REMOVED)
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @returns Object with entities Set and new lastIndex
   */
  collectEntitiesInRange(
    lastIndex: number,
    eventTypes: number,
    componentMask?: Uint8Array
  ): { entities: Set<number>; newIndex: number } {
    const currentWriteIndex = this.getWriteIndex();

    // Handle case where buffer has wrapped and we're too far behind
    // If more than maxEvents have been written since lastIndex, we've lost events
    if (currentWriteIndex - lastIndex > this.maxEvents) {
      // Start from the oldest available event
      lastIndex = currentWriteIndex - this.maxEvents;
      console.warn(
        "EventBuffer: Missed events due to buffer overflow, adjusting read index. Increase the maxEvents size to prevent this from happening."
      );
    }

    const seen = this.reusableSet;
    seen.clear();

    const fromIndex = lastIndex % this.maxEvents;
    const toIndex = currentWriteIndex % this.maxEvents;

    // No new events
    if (fromIndex === toIndex) {
      return { entities: seen, newIndex: currentWriteIndex };
    }

    // Calculate how many events to scan
    let eventsToScan: number;
    if (toIndex >= fromIndex) {
      eventsToScan = toIndex - fromIndex;
    } else {
      // Wrapped around
      eventsToScan = this.maxEvents - fromIndex + toIndex;
    }

    // Cap at maxEvents to prevent infinite loops if indices get corrupted
    if (eventsToScan > this.maxEvents) {
      eventsToScan = this.maxEvents;
    }

    // Direct inline scanning without generator overhead
    const dataView = this.dataView;
    const maxEvents = this.maxEvents;

    for (let i = 0; i < eventsToScan; i++) {
      const index = (fromIndex + i) % maxEvents;
      const dataIndex = index * 2;

      // Read packed data atomically
      const packedData = Atomics.load(dataView, dataIndex + 1);
      const eventType = (packedData & 0xff) as EventTypeValue;

      // Filter by event type bitmask
      if ((eventType & eventTypes) === 0) continue;

      // Filter by component mask for CHANGED events
      if (componentMask !== undefined && eventType === EventType.CHANGED) {
        const componentId = (packedData >> 16) & 0xffff;
        const byteIndex = componentId >> 3; // Math.floor(componentId / 8)
        const bitIndex = componentId & 7; // componentId % 8
        if (
          byteIndex >= componentMask.length ||
          (componentMask[byteIndex] & (1 << bitIndex)) === 0
        ) {
          continue;
        }
      }

      const entityId = Atomics.load(dataView, dataIndex);
      seen.add(entityId);
    }

    return {
      entities: seen,
      newIndex: currentWriteIndex,
    };
  }

  /**
   * Read events since the last index.
   * @param lastIndex - The last index read.
   * @returns Object with events array and the new write index.
   */
  readEvents(lastIndex: number): {
    events: Array<{
      entityId: EntityId;
      eventType: EventTypeValue;
      componentId: number;
    }>;
    newIndex: number;
  } {
    const currentWriteIndex = this.getWriteIndex();
    const events: Array<{
      entityId: EntityId;
      eventType: EventTypeValue;
      componentId: number;
    }> = [];

    // Handle case where buffer has wrapped and we're too far behind
    if (currentWriteIndex - lastIndex > this.maxEvents) {
      lastIndex = currentWriteIndex - this.maxEvents;
    }

    const fromIndex = lastIndex % this.maxEvents;
    const toIndex = currentWriteIndex % this.maxEvents;

    if (fromIndex === toIndex) {
      return { events, newIndex: currentWriteIndex };
    }

    let eventsToScan: number;
    if (toIndex >= fromIndex) {
      eventsToScan = toIndex - fromIndex;
    } else {
      eventsToScan = this.maxEvents - fromIndex + toIndex;
    }

    if (eventsToScan > this.maxEvents) {
      eventsToScan = this.maxEvents;
    }

    const dataView = this.dataView;
    const maxEvents = this.maxEvents;

    for (let i = 0; i < eventsToScan; i++) {
      const index = (fromIndex + i) % maxEvents;
      const dataIndex = index * 2;

      const packedData = Atomics.load(dataView, dataIndex + 1);
      const eventType = (packedData & 0xff) as EventTypeValue;
      const componentId = (packedData >> 16) & 0xffff;
      const entityId = Atomics.load(dataView, dataIndex);

      events.push({ entityId, eventType, componentId });
    }

    return { events, newIndex: currentWriteIndex };
  }
}
