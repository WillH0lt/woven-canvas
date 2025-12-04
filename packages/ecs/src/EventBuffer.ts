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
 *   [4..7]  maxEvents (u32) - capacity of the ring buffer
 */
const HEADER_SIZE = 8;
const WRITE_INDEX_OFFSET = 0;
const MAX_EVENTS_OFFSET = 1;

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
  private dataView: DataView;
  private readonly maxEvents: number;

  /**
   * Create a new EventBuffer
   * @param maxEvents - Maximum number of events to store (ring buffer wraps)
   */
  constructor(maxEvents: number = 65536) {
    this.maxEvents = maxEvents;
    const totalBytes = HEADER_SIZE + maxEvents * BYTES_PER_EVENT;
    this.buffer = new BufferConstructor(totalBytes);
    this.headerView = new Uint32Array(this.buffer, 0, 2);
    this.dataView = new DataView(this.buffer);

    // Initialize header
    this.headerView[WRITE_INDEX_OFFSET] = 0;
    this.headerView[MAX_EVENTS_OFFSET] = maxEvents;
  }

  /**
   * Create an EventBuffer from a shared buffer (for workers)
   * @param buffer - The SharedArrayBuffer from the main thread
   * @returns A new EventBuffer wrapping the shared buffer
   */
  static fromTransfer(buffer: ArrayBufferLike): EventBuffer {
    const instance = Object.create(EventBuffer.prototype);
    instance.buffer = buffer;
    instance.headerView = new Uint32Array(buffer, 0, 2);
    instance.dataView = new DataView(buffer);
    instance.maxEvents = instance.headerView[MAX_EVENTS_OFFSET];
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

    // Calculate byte offset for this event
    const offset = HEADER_SIZE + index * BYTES_PER_EVENT;

    // Write event data (not atomic, but each slot is only written by one thread at a time)
    this.dataView.setUint32(offset, entityId, true);
    this.dataView.setUint8(offset + 4, eventType);
    // Byte 5 is padding
    this.dataView.setUint16(offset + 6, componentId, true);
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
    const offset = HEADER_SIZE + index * BYTES_PER_EVENT;

    return {
      entityId: this.dataView.getUint32(offset, true),
      eventType: this.dataView.getUint8(offset + 4) as EventTypeValue,
      componentId: this.dataView.getUint16(offset + 6, true),
    };
  }

  /**
   * Get the current write index (for debugging/testing)
   */
  getWriteIndex(): number {
    return Atomics.load(this.headerView, WRITE_INDEX_OFFSET);
  }

  /**
   * Get the maximum number of events this buffer can hold
   */
  getMaxEvents(): number {
    return this.maxEvents;
  }

  /**
   * Iterate over events in a range of indices.
   * Handles wrap-around for ring buffer.
   *
   * @param fromIndex - Start index (inclusive)
   * @param toIndex - End index (exclusive), this is the writeIndex
   * @param eventTypes - Optional: bitmask of event types to include (e.g., EventType.ADDED | EventType.REMOVED)
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @yields Event objects matching the criteria
   */
  *getEventsInRange(
    fromIndex: number,
    toIndex: number,
    eventTypes?: number,
    componentMask?: Uint8Array
  ): Generator<{
    entityId: number;
    eventType: EventTypeValue;
    componentId: number;
  }> {
    // No new events
    if (fromIndex === toIndex) return;

    // Calculate how many events to scan
    let eventsToScan: number;
    if (toIndex >= fromIndex) {
      eventsToScan = toIndex - fromIndex;
    } else {
      // Wrapped around - this shouldn't happen with proper tracking
      // but handle it gracefully by scanning from fromIndex to maxEvents, then 0 to toIndex
      eventsToScan = this.maxEvents - fromIndex + toIndex;
    }

    // Cap at maxEvents to prevent infinite loops if indices get corrupted
    eventsToScan = Math.min(eventsToScan, this.maxEvents);

    for (let i = 0; i < eventsToScan; i++) {
      const index = (fromIndex + i) % this.maxEvents;
      const event = this.readEvent(index);

      // Filter by event type bitmask if specified
      if (eventTypes !== undefined && (event.eventType & eventTypes) === 0)
        continue;

      // Filter by component mask for CHANGED events
      if (
        componentMask !== undefined &&
        event.eventType === EventType.CHANGED
      ) {
        const byteIndex = Math.floor(event.componentId / 8);
        const bitIndex = event.componentId % 8;
        if (
          byteIndex >= componentMask.length ||
          (componentMask[byteIndex] & (1 << bitIndex)) === 0
        ) {
          continue;
        }
      }

      yield event;
    }
  }

  /**
   * Collect entity IDs from events in a range, updating the caller's lastIndex.
   * This is the efficient method for reactive queries.
   *
   * @param lastIndex - The last index this caller scanned (will be updated)
   * @param eventTypes - Bitmask of event types to include (e.g., EventType.ADDED | EventType.REMOVED)
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @returns Object with entities array and new lastIndex
   */
  collectEntitiesInRange(
    lastIndex: number,
    eventTypes: number,
    componentMask?: Uint8Array
  ): { entities: Uint32Array; newIndex: number } {
    const currentWriteIndex = this.getWriteIndex();

    // Handle case where buffer has wrapped and we're too far behind
    // If more than maxEvents have been written since lastIndex, we've lost events
    if (currentWriteIndex - lastIndex > this.maxEvents) {
      // Start from the oldest available event
      lastIndex = currentWriteIndex - this.maxEvents;
    }

    const seen = new Set<number>();

    for (const event of this.getEventsInRange(
      lastIndex % this.maxEvents,
      currentWriteIndex % this.maxEvents,
      eventTypes,
      componentMask
    )) {
      seen.add(event.entityId);
    }

    return {
      entities: new Uint32Array([...seen]),
      newIndex: currentWriteIndex,
    };
  }
}
