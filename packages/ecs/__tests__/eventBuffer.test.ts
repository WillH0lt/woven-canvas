import { describe, it, expect, beforeEach } from "vitest";
import { EventBuffer, EventType } from "../src/EventBuffer";

describe("EventBuffer", () => {
  let eventBuffer: EventBuffer;

  beforeEach(() => {
    eventBuffer = new EventBuffer(1000);
  });

  describe("initialization", () => {
    it("should initialize with write index 0", () => {
      expect(eventBuffer.getWriteIndex()).toBe(0);
    });
  });

  describe("push events", () => {
    it("should push ADDED event", () => {
      eventBuffer.pushAdded(42);

      const events = [
        ...eventBuffer.getEventsInRange(
          0,
          eventBuffer.getWriteIndex(),
          EventType.ADDED
        ),
      ];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(42);
      expect(events[0].eventType).toBe(EventType.ADDED);
    });

    it("should push REMOVED event", () => {
      eventBuffer.pushRemoved(123);

      const events = [
        ...eventBuffer.getEventsInRange(
          0,
          eventBuffer.getWriteIndex(),
          EventType.REMOVED
        ),
      ];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(123);
      expect(events[0].eventType).toBe(EventType.REMOVED);
    });

    it("should push CHANGED event with componentId", () => {
      eventBuffer.pushChanged(99, 5);

      const events = [
        ...eventBuffer.getEventsInRange(
          0,
          eventBuffer.getWriteIndex(),
          EventType.CHANGED
        ),
      ];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(99);
      expect(events[0].eventType).toBe(EventType.CHANGED);
      expect(events[0].componentId).toBe(5);
    });

    it("should increment write index on each push", () => {
      eventBuffer.pushAdded(1);
      expect(eventBuffer.getWriteIndex()).toBe(1);

      eventBuffer.pushAdded(2);
      expect(eventBuffer.getWriteIndex()).toBe(2);

      eventBuffer.pushRemoved(3);
      expect(eventBuffer.getWriteIndex()).toBe(3);
    });
  });

  describe("getEventsInRange", () => {
    it("should return events in a range of indices", () => {
      eventBuffer.pushAdded(1);
      eventBuffer.pushAdded(2);
      eventBuffer.pushAdded(3);
      eventBuffer.pushAdded(4);

      // Get all events from index 0 to current write index
      const events = [
        ...eventBuffer.getEventsInRange(0, eventBuffer.getWriteIndex()),
      ];
      expect(events.length).toBe(4);

      const entityIds = events.map((e) => e.entityId).sort((a, b) => a - b);
      expect(entityIds).toEqual([1, 2, 3, 4]);
    });

    it("should filter by event type", () => {
      eventBuffer.pushAdded(1);
      eventBuffer.pushRemoved(2);
      eventBuffer.pushChanged(3, 0);

      const writeIndex = eventBuffer.getWriteIndex();

      const addedEvents = [
        ...eventBuffer.getEventsInRange(0, writeIndex, EventType.ADDED),
      ];
      expect(addedEvents.length).toBe(1);
      expect(addedEvents[0].entityId).toBe(1);

      const removedEvents = [
        ...eventBuffer.getEventsInRange(0, writeIndex, EventType.REMOVED),
      ];
      expect(removedEvents.length).toBe(1);
      expect(removedEvents[0].entityId).toBe(2);

      const changedEvents = [
        ...eventBuffer.getEventsInRange(0, writeIndex, EventType.CHANGED),
      ];
      expect(changedEvents.length).toBe(1);
      expect(changedEvents[0].entityId).toBe(3);
    });

    it("should filter CHANGED events by componentMask", () => {
      eventBuffer.pushChanged(1, 0); // component 0
      eventBuffer.pushChanged(2, 1); // component 1
      eventBuffer.pushChanged(3, 2); // component 2

      const writeIndex = eventBuffer.getWriteIndex();

      // Mask for component 0 (bit 0)
      const comp0Events = [
        ...eventBuffer.getEventsInRange(
          0,
          writeIndex,
          EventType.CHANGED,
          new Uint8Array([0b001])
        ),
      ];
      expect(comp0Events.length).toBe(1);
      expect(comp0Events[0].entityId).toBe(1);

      // Mask for component 1 (bit 1)
      const comp1Events = [
        ...eventBuffer.getEventsInRange(
          0,
          writeIndex,
          EventType.CHANGED,
          new Uint8Array([0b010])
        ),
      ];
      expect(comp1Events.length).toBe(1);
      expect(comp1Events[0].entityId).toBe(2);

      // Mask for components 0 and 2 (bits 0 and 2)
      const comp02Events = [
        ...eventBuffer.getEventsInRange(
          0,
          writeIndex,
          EventType.CHANGED,
          new Uint8Array([0b101])
        ),
      ];
      expect(comp02Events.length).toBe(2);
    });

    it("should return empty when fromIndex equals toIndex", () => {
      eventBuffer.pushAdded(1);

      const writeIndex = eventBuffer.getWriteIndex();
      // fromIndex == toIndex means no new events
      const events = [...eventBuffer.getEventsInRange(writeIndex, writeIndex)];
      expect(events.length).toBe(0);
    });
  });

  describe("collectEntitiesInRange", () => {
    it("should collect entities from a range of indices", () => {
      eventBuffer.pushAdded(1);
      eventBuffer.pushAdded(2);
      eventBuffer.pushAdded(3);

      const { entities, newIndex } = eventBuffer.collectEntitiesInRange(
        0,
        EventType.ADDED
      );
      expect(entities.size).toBe(3);
      expect([...entities].sort()).toEqual([1, 2, 3]);
      expect(newIndex).toBe(3);
    });

    it("should only scan new events on subsequent calls", () => {
      eventBuffer.pushAdded(1);
      eventBuffer.pushAdded(2);

      // First call
      const result1 = eventBuffer.collectEntitiesInRange(0, EventType.ADDED);
      expect(result1.entities.size).toBe(2);
      expect(result1.newIndex).toBe(2);

      // Add more events
      eventBuffer.pushAdded(3);
      eventBuffer.pushAdded(4);

      // Second call starting from where we left off
      const result2 = eventBuffer.collectEntitiesInRange(
        result1.newIndex,
        EventType.ADDED
      );
      expect(result2.entities.size).toBe(2);
      expect([...result2.entities].sort()).toEqual([3, 4]);
      expect(result2.newIndex).toBe(4);
    });

    it("should return empty when no new events", () => {
      eventBuffer.pushAdded(1);

      const result1 = eventBuffer.collectEntitiesInRange(0, EventType.ADDED);
      expect(result1.newIndex).toBe(1);

      // No new events
      const result2 = eventBuffer.collectEntitiesInRange(
        result1.newIndex,
        EventType.ADDED
      );
      expect(result2.entities.size).toBe(0);
      expect(result2.newIndex).toBe(1);
    });

    it("should deduplicate entities", () => {
      eventBuffer.pushChanged(1, 0);
      eventBuffer.pushChanged(1, 1); // Same entity, different component
      eventBuffer.pushChanged(1, 2); // Same entity, different component
      eventBuffer.pushChanged(2, 0);

      const { entities } = eventBuffer.collectEntitiesInRange(
        0,
        EventType.CHANGED
      );
      expect(entities.size).toBe(2);
      expect([...entities].sort()).toEqual([1, 2]);
    });

    it("should filter by component mask", () => {
      eventBuffer.pushChanged(1, 0); // component 0
      eventBuffer.pushChanged(2, 1); // component 1
      eventBuffer.pushChanged(3, 2); // component 2

      // Only get changes for component 1
      const { entities } = eventBuffer.collectEntitiesInRange(
        0,
        EventType.CHANGED,
        new Uint8Array([0b010])
      );
      expect(entities.size).toBe(1);
      expect(entities.has(2)).toBe(true);
    });
  });

  describe("ring buffer wrapping", () => {
    it("should wrap around when buffer is full", () => {
      const smallBuffer = new EventBuffer(10);

      // Push more events than the buffer can hold
      for (let i = 0; i < 15; i++) {
        smallBuffer.pushAdded(i);
      }

      // Write index should continue incrementing (not wrap)
      expect(smallBuffer.getWriteIndex()).toBe(15);

      // Reading events starting partway through should work
      // From index 6 to current (15), that's indices 6,7,8,9,0,1,2,3,4 in ring buffer
      const events = [...smallBuffer.getEventsInRange(6, 15 % 10)];
      // 6 to 5 (wrapping) = 9 events
      expect(events.length).toBe(9);
    });
  });

  describe("fromTransfer", () => {
    it("should create EventBuffer from shared buffer", () => {
      eventBuffer.pushAdded(42);
      eventBuffer.pushRemoved(99);

      const buffer = eventBuffer.getBuffer();
      const transferred = EventBuffer.fromTransfer(buffer);

      // Should see same data
      expect(transferred.getWriteIndex()).toBe(2);

      const addedEvents = [
        ...transferred.getEventsInRange(
          0,
          transferred.getWriteIndex(),
          EventType.ADDED
        ),
      ];
      expect(addedEvents.length).toBe(1);
      expect(addedEvents[0].entityId).toBe(42);
    });

    it("should allow writes from transferred buffer", () => {
      const buffer = eventBuffer.getBuffer();
      const transferred = EventBuffer.fromTransfer(buffer);

      transferred.pushChanged(123, 5);

      const events = [
        ...eventBuffer.getEventsInRange(
          0,
          eventBuffer.getWriteIndex(),
          EventType.CHANGED
        ),
      ];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(123);
    });
  });

  describe("readEvent", () => {
    it("should return event data for any slot", () => {
      // Even unwritten slots return an event object
      const event = eventBuffer.readEvent(0);
      expect(event).toBeDefined();
    });

    it("should return event for filled slot", () => {
      eventBuffer.pushAdded(42);

      const event = eventBuffer.readEvent(0);
      expect(event).toBeDefined();
      expect(event.entityId).toBe(42);
      expect(event.eventType).toBe(EventType.ADDED);
    });
  });
});
