import { describe, it, expect, beforeEach } from "vitest";
import { EventBuffer, EventType } from "../src/EventBuffer";

describe("EventBuffer", () => {
  let eventBuffer: EventBuffer;

  beforeEach(() => {
    eventBuffer = new EventBuffer(1000);
  });

  describe("initialization", () => {
    it("should initialize with tick 0", () => {
      expect(eventBuffer.getCurrentTick()).toBe(0);
    });

    it("should initialize with write index 0", () => {
      expect(eventBuffer.getWriteIndex()).toBe(0);
    });

    it("should create with default maxEvents", () => {
      const defaultBuffer = new EventBuffer();
      expect(defaultBuffer.getBuffer()).toBeDefined();
    });
  });

  describe("tick management", () => {
    it("should increment tick", () => {
      const tick1 = eventBuffer.incrementTick();
      expect(tick1).toBe(1);

      const tick2 = eventBuffer.incrementTick();
      expect(tick2).toBe(2);
    });

    it("should report current tick correctly", () => {
      eventBuffer.incrementTick();
      eventBuffer.incrementTick();
      expect(eventBuffer.getCurrentTick()).toBe(2);
    });
  });

  describe("push events", () => {
    it("should push ADDED event", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(42);

      const events = [...eventBuffer.getEventsSince(0, EventType.ADDED)];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(42);
      expect(events[0].eventType).toBe(EventType.ADDED);
      expect(events[0].tick).toBe(1);
    });

    it("should push REMOVED event", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushRemoved(123);

      const events = [...eventBuffer.getEventsSince(0, EventType.REMOVED)];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(123);
      expect(events[0].eventType).toBe(EventType.REMOVED);
    });

    it("should push CHANGED event with componentId", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushChanged(99, 5);

      const events = [...eventBuffer.getEventsSince(0, EventType.CHANGED)];
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

  describe("getEventsSince", () => {
    it("should return events since a given tick", () => {
      eventBuffer.incrementTick(); // tick 1
      eventBuffer.pushAdded(1);

      eventBuffer.incrementTick(); // tick 2
      eventBuffer.pushAdded(2);
      eventBuffer.pushAdded(3);

      eventBuffer.incrementTick(); // tick 3
      eventBuffer.pushAdded(4);

      // Get events since tick 1 (should include tick 2 and 3)
      const events = [...eventBuffer.getEventsSince(1)];
      expect(events.length).toBe(3);

      const entityIds = events.map((e) => e.entityId).sort((a, b) => a - b);
      expect(entityIds).toEqual([2, 3, 4]);
    });

    it("should filter by event type", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(1);
      eventBuffer.pushRemoved(2);
      eventBuffer.pushChanged(3, 0);

      const addedEvents = [...eventBuffer.getEventsSince(0, EventType.ADDED)];
      expect(addedEvents.length).toBe(1);
      expect(addedEvents[0].entityId).toBe(1);

      const removedEvents = [
        ...eventBuffer.getEventsSince(0, EventType.REMOVED),
      ];
      expect(removedEvents.length).toBe(1);
      expect(removedEvents[0].entityId).toBe(2);

      const changedEvents = [
        ...eventBuffer.getEventsSince(0, EventType.CHANGED),
      ];
      expect(changedEvents.length).toBe(1);
      expect(changedEvents[0].entityId).toBe(3);
    });

    it("should filter CHANGED events by componentMask", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushChanged(1, 0); // component 0
      eventBuffer.pushChanged(2, 1); // component 1
      eventBuffer.pushChanged(3, 2); // component 2

      // Mask for component 0 (bit 0)
      const comp0Events = [
        ...eventBuffer.getEventsSince(0, EventType.CHANGED, 0b001),
      ];
      expect(comp0Events.length).toBe(1);
      expect(comp0Events[0].entityId).toBe(1);

      // Mask for component 1 (bit 1)
      const comp1Events = [
        ...eventBuffer.getEventsSince(0, EventType.CHANGED, 0b010),
      ];
      expect(comp1Events.length).toBe(1);
      expect(comp1Events[0].entityId).toBe(2);

      // Mask for components 0 and 2 (bits 0 and 2)
      const comp02Events = [
        ...eventBuffer.getEventsSince(0, EventType.CHANGED, 0b101),
      ];
      expect(comp02Events.length).toBe(2);
    });

    it("should return empty for events before sinceTick", () => {
      eventBuffer.incrementTick(); // tick 1
      eventBuffer.pushAdded(1);

      // Ask for events since tick 1 - should be empty since event is AT tick 1
      const events = [...eventBuffer.getEventsSince(1)];
      expect(events.length).toBe(0);
    });
  });

  describe("collectEntitiesInRange", () => {
    it("should collect entities from a range of indices", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(1);
      eventBuffer.pushAdded(2);
      eventBuffer.pushAdded(3);

      const { entities, newIndex } = eventBuffer.collectEntitiesInRange(
        0,
        EventType.ADDED
      );
      expect(entities.length).toBe(3);
      expect([...entities].sort()).toEqual([1, 2, 3]);
      expect(newIndex).toBe(3);
    });

    it("should only scan new events on subsequent calls", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(1);
      eventBuffer.pushAdded(2);

      // First call
      const result1 = eventBuffer.collectEntitiesInRange(0, EventType.ADDED);
      expect(result1.entities.length).toBe(2);
      expect(result1.newIndex).toBe(2);

      // Add more events
      eventBuffer.pushAdded(3);
      eventBuffer.pushAdded(4);

      // Second call starting from where we left off
      const result2 = eventBuffer.collectEntitiesInRange(
        result1.newIndex,
        EventType.ADDED
      );
      expect(result2.entities.length).toBe(2);
      expect([...result2.entities].sort()).toEqual([3, 4]);
      expect(result2.newIndex).toBe(4);
    });

    it("should return empty when no new events", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(1);

      const result1 = eventBuffer.collectEntitiesInRange(0, EventType.ADDED);
      expect(result1.newIndex).toBe(1);

      // No new events
      const result2 = eventBuffer.collectEntitiesInRange(
        result1.newIndex,
        EventType.ADDED
      );
      expect(result2.entities.length).toBe(0);
      expect(result2.newIndex).toBe(1);
    });

    it("should deduplicate entities", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushChanged(1, 0);
      eventBuffer.pushChanged(1, 1); // Same entity, different component
      eventBuffer.pushChanged(1, 2); // Same entity, different component
      eventBuffer.pushChanged(2, 0);

      const { entities } = eventBuffer.collectEntitiesInRange(
        0,
        EventType.CHANGED
      );
      expect(entities.length).toBe(2);
      expect([...entities].sort()).toEqual([1, 2]);
    });

    it("should filter by component mask", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushChanged(1, 0); // component 0
      eventBuffer.pushChanged(2, 1); // component 1
      eventBuffer.pushChanged(3, 2); // component 2

      // Only get changes for component 1
      const { entities } = eventBuffer.collectEntitiesInRange(
        0,
        EventType.CHANGED,
        0b010
      );
      expect(entities.length).toBe(1);
      expect(entities[0]).toBe(2);
    });
  });

  describe("collectEntitiesSince (deprecated)", () => {
    it("should deduplicate entities", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushChanged(1, 0);
      eventBuffer.pushChanged(1, 1); // Same entity, different component
      eventBuffer.pushChanged(1, 2); // Same entity, different component
      eventBuffer.pushChanged(2, 0);

      const entities = eventBuffer.collectEntitiesSince(0, EventType.CHANGED);
      expect(entities.length).toBe(2);
      expect([...entities].sort()).toEqual([1, 2]);
    });

    it("should return Uint32Array", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(1);

      const entities = eventBuffer.collectEntitiesSince(0, EventType.ADDED);
      expect(entities).toBeInstanceOf(Uint32Array);
    });
  });

  describe("ring buffer wrapping", () => {
    it("should wrap around when buffer is full", () => {
      const smallBuffer = new EventBuffer(10);

      smallBuffer.incrementTick();

      // Push more events than the buffer can hold
      for (let i = 0; i < 15; i++) {
        smallBuffer.pushAdded(i);
      }

      // Write index should have wrapped
      expect(smallBuffer.getWriteIndex()).toBe(15);

      // Should still be able to read recent events
      const events = [...smallBuffer.getEventsSince(0)];
      // Due to overwriting, we'll have 10 events
      expect(events.length).toBe(10);
    });
  });

  describe("fromTransfer", () => {
    it("should create EventBuffer from shared buffer", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(42);
      eventBuffer.pushRemoved(99);

      const buffer = eventBuffer.getBuffer();
      const transferred = EventBuffer.fromTransfer(buffer);

      // Should see same data
      expect(transferred.getCurrentTick()).toBe(1);
      expect(transferred.getWriteIndex()).toBe(2);

      const addedEvents = [...transferred.getEventsSince(0, EventType.ADDED)];
      expect(addedEvents.length).toBe(1);
      expect(addedEvents[0].entityId).toBe(42);
    });

    it("should allow writes from transferred buffer", () => {
      const buffer = eventBuffer.getBuffer();
      const transferred = EventBuffer.fromTransfer(buffer);

      transferred.incrementTick();
      transferred.pushChanged(123, 5);

      // Original should see the changes
      expect(eventBuffer.getCurrentTick()).toBe(1);

      const events = [...eventBuffer.getEventsSince(0, EventType.CHANGED)];
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(123);
    });
  });

  describe("readEvent", () => {
    it("should return event data for any slot", () => {
      // Even unwritten slots return an event object (with tick 0)
      const event = eventBuffer.readEvent(0);
      expect(event).toBeDefined();
      expect(event.tick).toBe(0);
    });

    it("should return event for filled slot", () => {
      eventBuffer.incrementTick();
      eventBuffer.pushAdded(42);

      const event = eventBuffer.readEvent(0);
      expect(event).toBeDefined();
      expect(event.entityId).toBe(42);
      expect(event.eventType).toBe(EventType.ADDED);
      expect(event.tick).toBe(1);
    });
  });
});
