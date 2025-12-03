import type { EntityId } from "./types";

const BufferConstructor: new (byteLength: number) => ArrayBufferLike =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

/**
 * Event types for the ring buffer
 */
export const EventType = {
  ADDED: 0,
  REMOVED: 1,
  CHANGED: 2,
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

/**
 * Event structure (12 bytes per event):
 *   [0..3]  tick (u32) - when the event occurred
 *   [4..7]  entityId (u32) - which entity
 *   [8]     eventType (u8) - ADDED, REMOVED, or CHANGED
 *   [9]     componentId (u8) - which component (for CHANGED events)
 *   [10..11] padding (u16) - alignment padding
 */
const BYTES_PER_EVENT = 12;

/**
 * Header layout:
 *   [0..3]  writeIndex (u32, atomic) - next write position (wraps around)
 *   [4..7]  currentTick (u32, atomic) - global tick counter
 *   [8..11] maxEvents (u32) - capacity of the ring buffer
 *   [12..15] padding - alignment
 */
const HEADER_SIZE = 16;
const WRITE_INDEX_OFFSET = 0;
const CURRENT_TICK_OFFSET = 1; // In u32 units
const MAX_EVENTS_OFFSET = 2;

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
    this.headerView = new Uint32Array(this.buffer, 0, 4);
    this.dataView = new DataView(this.buffer);

    // Initialize header
    this.headerView[WRITE_INDEX_OFFSET] = 0;
    this.headerView[CURRENT_TICK_OFFSET] = 0;
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
    instance.headerView = new Uint32Array(buffer, 0, 4);
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
   * Get the current global tick
   */
  getCurrentTick(): number {
    return Atomics.load(this.headerView, CURRENT_TICK_OFFSET);
  }

  /**
   * Increment the global tick counter (call at start of each execute cycle)
   * @returns The new tick value
   */
  incrementTick(): number {
    return Atomics.add(this.headerView, CURRENT_TICK_OFFSET, 1) + 1;
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
    const tick = this.getCurrentTick();

    // Atomically get and increment write index
    const index =
      Atomics.add(this.headerView, WRITE_INDEX_OFFSET, 1) % this.maxEvents;

    // Calculate byte offset for this event
    const offset = HEADER_SIZE + index * BYTES_PER_EVENT;

    // Write event data (not atomic, but each slot is only written by one thread at a time)
    this.dataView.setUint32(offset, tick, true);
    this.dataView.setUint32(offset + 4, entityId, true);
    this.dataView.setUint8(offset + 8, eventType);
    this.dataView.setUint8(offset + 9, componentId);
    // Bytes 10-11 are padding, no need to write
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
   * Read an event at a specific index
   * @param index - The index in the ring buffer (0 to maxEvents-1)
   * @returns The event data
   */
  readEvent(index: number): {
    tick: number;
    entityId: number;
    eventType: EventTypeValue;
    componentId: number;
  } {
    const offset = HEADER_SIZE + index * BYTES_PER_EVENT;

    return {
      tick: this.dataView.getUint32(offset, true),
      entityId: this.dataView.getUint32(offset + 4, true),
      eventType: this.dataView.getUint8(offset + 8) as EventTypeValue,
      componentId: this.dataView.getUint8(offset + 9),
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
   * @param eventType - Optional: filter by event type
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @yields Event objects matching the criteria
   */
  *getEventsInRange(
    fromIndex: number,
    toIndex: number,
    eventType?: EventTypeValue,
    componentMask?: number
  ): Generator<{
    tick: number;
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

      // Filter by event type if specified
      if (eventType !== undefined && event.eventType !== eventType) continue;

      // Filter by component mask for CHANGED events
      if (
        componentMask !== undefined &&
        event.eventType === EventType.CHANGED
      ) {
        if ((componentMask & (1 << event.componentId)) === 0) continue;
      }

      yield event;
    }
  }

  /**
   * Collect entity IDs from events in a range, updating the caller's lastIndex.
   * This is the efficient method for reactive queries.
   *
   * @param lastIndex - The last index this caller scanned (will be updated)
   * @param eventType - Filter by event type
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @returns Object with entities array and new lastIndex
   */
  collectEntitiesInRange(
    lastIndex: number,
    eventType: EventTypeValue,
    componentMask?: number
  ): { entities: Uint32Array; newIndex: number } {
    const currentWriteIndex = this.getWriteIndex();

    // Handle case where buffer has wrapped and we're too far behind
    // If more than maxEvents have been written since lastIndex, we've lost events
    if (currentWriteIndex - lastIndex > this.maxEvents) {
      // Start from the oldest available event
      lastIndex = currentWriteIndex - this.maxEvents;
    }

    const seen = new Set<number>();
    const results: number[] = [];

    for (const event of this.getEventsInRange(
      lastIndex % this.maxEvents,
      currentWriteIndex % this.maxEvents,
      eventType,
      componentMask
    )) {
      if (!seen.has(event.entityId)) {
        seen.add(event.entityId);
        results.push(event.entityId);
      }
    }

    return {
      entities: new Uint32Array(results),
      newIndex: currentWriteIndex,
    };
  }

  /**
   * Iterate over events since a given tick
   * Returns events in no particular order (ring buffer may have wrapped)
   * @deprecated Use getEventsInRange for better performance
   *
   * @param sinceTick - Only return events with tick > sinceTick
   * @param eventType - Optional: filter by event type
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @yields Event objects matching the criteria
   */
  *getEventsSince(
    sinceTick: number,
    eventType?: EventTypeValue,
    componentMask?: number
  ): Generator<{
    tick: number;
    entityId: number;
    eventType: EventTypeValue;
    componentId: number;
  }> {
    const writeIndex = this.getWriteIndex();

    // If no events have been written, return early
    if (writeIndex === 0) return;

    // Determine how many slots to scan
    // If writeIndex <= maxEvents, scan from 0 to writeIndex
    // If writeIndex > maxEvents (wrapped), scan all slots
    const slotsToScan =
      writeIndex <= this.maxEvents ? writeIndex : this.maxEvents;

    for (let i = 0; i < slotsToScan; i++) {
      const event = this.readEvent(i);

      // Filter by tick
      if (event.tick <= sinceTick) continue;

      // Filter by event type if specified
      if (eventType !== undefined && event.eventType !== eventType) continue;

      // Filter by component mask for CHANGED events
      if (
        componentMask !== undefined &&
        event.eventType === EventType.CHANGED
      ) {
        if ((componentMask & (1 << event.componentId)) === 0) continue;
      }

      yield event;
    }
  }

  /**
   * Collect entity IDs from events since a given tick
   * Deduplicates entities that appear multiple times
   * @deprecated Use collectEntitiesInRange for better performance
   *
   * @param sinceTick - Only return events with tick > sinceTick
   * @param eventType - Filter by event type
   * @param componentMask - Optional: for CHANGED events, filter by component mask
   * @returns Array of unique entity IDs
   */
  collectEntitiesSince(
    sinceTick: number,
    eventType: EventTypeValue,
    componentMask?: number
  ): Uint32Array {
    const seen = new Set<number>();
    const results: number[] = [];

    for (const event of this.getEventsSince(
      sinceTick,
      eventType,
      componentMask
    )) {
      if (!seen.has(event.entityId)) {
        seen.add(event.entityId);
        results.push(event.entityId);
      }
    }

    return new Uint32Array(results);
  }
}
