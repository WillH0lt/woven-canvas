import type { Context, QueryMasks } from "../types";
import { QueryCache } from "./Cache";
import { EventType } from "../EventBuffer";

/**
 * Reads events from EventBuffer and processes them for a query.
 * Maintains state for incremental reading and computes added/removed/changed lazily.
 */
export class QueryReader {
  private lastIndex: number;
  private lastTick: number = -1;

  // Pending event range (set when cache is updated, read when results are computed)
  private fromIndex: number = 0;
  private toIndex: number = 0;

  // results computed from last processed events
  added: number[] = [];
  removed: number[] = [];
  changed: number[] = [];

  constructor(startIndex: number) {
    this.lastIndex = startIndex;
  }

  /**
   * Check for new events and update the cache. Returns true if there were new events.
   */
  updateCache(ctx: Context, cache: QueryCache, masks: QueryMasks): boolean {
    if (ctx.tick === this.lastTick) {
      return this.fromIndex !== this.toIndex;
    }

    // Reset for new tick
    this.added = [];
    this.removed = [];
    this.changed = [];
    this.lastTick = ctx.tick;

    const currentIndex = ctx.eventBuffer.getWriteIndex();
    if (currentIndex === this.lastIndex) {
      this.fromIndex = this.toIndex = 0;
      return false;
    }

    // Store range for lazy result computation
    this.fromIndex = this.lastIndex;
    this.toIndex = currentIndex;
    this.lastIndex = currentIndex;

    // Process events to update cache and compute results in one pass
    this.processEventsAndComputeResults(ctx, cache, masks);
    return true;
  }

  /**
   * Process events from the buffer, updating cache and computing results in a single pass.
   * This ensures we have access to wasInCache state when determining added/removed.
   */
  private processEventsAndComputeResults(
    ctx: Context,
    cache: QueryCache,
    masks: QueryMasks
  ): void {
    const maxEvents = ctx.maxEvents;
    const entityBuffer = ctx.entityBuffer;
    const dataView = ctx.eventBuffer.getDataView();

    let fromIndex = this.fromIndex;
    const toIndex = this.toIndex;

    // Handle buffer overflow
    if (toIndex - fromIndex > maxEvents) {
      fromIndex = toIndex - maxEvents;
    }

    const fromSlot = fromIndex % maxEvents;
    const toSlot = toIndex % maxEvents;
    if (fromSlot === toSlot) {
      return;
    }

    let eventsToScan =
      toSlot >= fromSlot ? toSlot - fromSlot : maxEvents - fromSlot + toSlot;
    if (eventsToScan > maxEvents) eventsToScan = maxEvents;

    // Track entity states for result computation
    const added = this.added;
    const removed = this.removed;
    const changed = this.changed;

    added.length = 0;
    removed.length = 0;
    changed.length = 0;

    const seen: { [key: number]: number } = {};

    const STATE_ADDED = 1;
    const STATE_REMOVED = 2;
    const STATE_CHANGED = 3;

    const hasTracking = masks.hasTracking;
    const trackingMask = masks.tracking;

    for (let i = 0; i < eventsToScan; i++) {
      const slot = (fromSlot + i) % maxEvents;
      const dataIndex = slot * 2;

      const entityId = Atomics.load(dataView, dataIndex);
      const packedData = Atomics.load(dataView, dataIndex + 1);
      const eventType = packedData & 0xff;

      // Check cache state BEFORE any updates for this event
      const wasInCache = cache.has(entityId);
      const existingState = seen[entityId];

      if (eventType === EventType.REMOVED) {
        // Update cache
        if (wasInCache) cache.remove(entityId);

        // Compute results
        if (existingState === STATE_ADDED) {
          // Added then removed - cancel out
          const idx = added.indexOf(entityId);
          if (idx !== -1) {
            added[idx] = added[added.length - 1];
            added.length--;
          }
          seen[entityId] = STATE_REMOVED;
        } else if (!existingState && wasInCache) {
          // Entity was in cache, now removed
          seen[entityId] = STATE_REMOVED;
          removed.push(entityId);
        }
      } else if (eventType === EventType.ADDED) {
        // Update cache
        const matchesNow = entityBuffer.matches(entityId, masks);
        if (!wasInCache && matchesNow) {
          cache.add(entityId);
        }

        // Compute results - entity added to cache
        if (!existingState && !wasInCache && matchesNow) {
          seen[entityId] = STATE_ADDED;
          added.push(entityId);
        }
      } else if (
        eventType === EventType.COMPONENT_ADDED ||
        eventType === EventType.COMPONENT_REMOVED
      ) {
        // Update cache
        const stillExists = entityBuffer.has(entityId);
        const matchesNow = stillExists && entityBuffer.matches(entityId, masks);
        if (matchesNow && !wasInCache) {
          cache.add(entityId);
        } else if (!matchesNow && wasInCache) {
          cache.remove(entityId);
        }

        // Compute results
        if (!existingState) {
          if (!wasInCache && matchesNow) {
            // Entity entered the query
            seen[entityId] = STATE_ADDED;
            added.push(entityId);
          } else if (wasInCache && !matchesNow) {
            // Entity left the query
            seen[entityId] = STATE_REMOVED;
            removed.push(entityId);
          }
        }
      } else if (eventType === EventType.CHANGED && hasTracking) {
        // No cache update needed for CHANGED events

        // Compute results - only for entities currently in cache
        if (!existingState && wasInCache) {
          const componentId = (packedData >> 16) & 0xffff;
          const byteIndex = componentId >> 3;
          const bitIndex = componentId & 7;

          if (
            byteIndex < trackingMask.length &&
            (trackingMask[byteIndex] & (1 << bitIndex)) !== 0
          ) {
            seen[entityId] = STATE_CHANGED;
            changed.push(entityId);
          }
        }
      }
    }
  }
}
