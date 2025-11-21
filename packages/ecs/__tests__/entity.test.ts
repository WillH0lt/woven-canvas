import { describe, it, expect, beforeEach } from "vitest";
import { field, component, Entity, World } from "../src/index.js";

describe("Entity", () => {
  // Define some test components
  const Position = component({
    x: field.float32().default(0),
    y: field.float32().default(0),
  });

  const Velocity = component({
    dx: field.float32().default(0),
    dy: field.float32().default(0),
  });

  const Health = component({
    current: field.uint16().default(100),
    max: field.uint16().default(100),
  });

  describe("Entity - Basic Operations", () => {
    let entity: Entity;
    let world: World;

    beforeEach(() => {
      world = new World();
      entity = world.createEntity();
    });

    it("should add a component to entity", () => {
      const pos = entity.add(Position, { x: 10, y: 20 });

      expect(pos.value.x).toBeCloseTo(10);
      expect(pos.value.y).toBeCloseTo(20);
      expect(entity.has(Position)).toBe(true);
    });

    it("should throw error when adding duplicate component", () => {
      entity.add(Position, { x: 10, y: 20 });

      expect(() => {
        entity.add(Position, { x: 30, y: 40 });
      }).toThrow("Entity 1 already has component:");
    });

    it("should get a component from entity", () => {
      entity.add(Position, { x: 15, y: 25 });

      const pos = entity.get(Position);
      expect(pos).toBeDefined();
      expect(pos!.value.x).toBeCloseTo(15);
      expect(pos!.value.y).toBeCloseTo(25);
    });

    it("should return undefined for non-existent component", () => {
      const pos = entity.get(Position);
      expect(pos).toBeUndefined();
    });

    it("should remove a component", () => {
      entity.add(Position, { x: 10, y: 20 });
      expect(entity.has(Position)).toBe(true);

      const removed = entity.remove(Position);
      expect(removed).toBe(true);
      expect(entity.has(Position)).toBe(false);
    });

    it("should return false when removing non-existent component", () => {
      const removed = entity.remove(Position);
      expect(removed).toBe(false);
    });

    it("should add multiple components", () => {
      entity.add(Position, { x: 10, y: 20 });
      entity.add(Velocity, { dx: 1, dy: 2 });
      entity.add(Health, { current: 80, max: 100 });

      expect(entity.has(Position)).toBe(true);
      expect(entity.has(Velocity)).toBe(true);
      expect(entity.has(Health)).toBe(true);
    });
  });

  describe("World", () => {
    let world: World;

    beforeEach(() => {
      world = new World();
    });

    it("should create entities with sequential IDs", () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      const e3 = world.createEntity();

      expect(e1.getId()).toBe(1);
      expect(e2.getId()).toBe(2);
      expect(e3.getId()).toBe(3);
    });

    it("should remove entity by instance", () => {
      const entity = world.createEntity();

      const removed = world.removeEntity(entity);
      expect(removed).toBe(true);
    });

    it("should return false when removing non-existent entity", () => {
      const otherWorld = new World();
      const entity = otherWorld.createEntity();

      const removed = world.removeEntity(entity);
      expect(removed).toBe(false);
    });
  });

  describe("Real-World Usage", () => {
    it("should handle component lifecycle", () => {
      const world = new World();

      const entity = world.createEntity();
      entity.add(Health, { current: 100, max: 100 });

      // Take damage
      const health = entity.get(Health)!;
      health.value.current -= 50;

      expect(health.value.current).toBe(50);

      // If health reaches 0, remove health component
      health.value.current = 0;

      if (health.value.current <= 0) {
        entity.remove(Health);
      }

      expect(entity.has(Health)).toBe(false);
    });
  });
});
