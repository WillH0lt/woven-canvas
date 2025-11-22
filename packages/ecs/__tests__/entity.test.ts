import { describe, it, expect, beforeEach } from "vitest";
import { field, Entity, World } from "../src/index";

describe("Entity", () => {
  let world: World;
  let Position: any;
  let Velocity: any;
  let Health: any;

  beforeEach(() => {
    world = new World();

    // Define some test components
    Position = world.createComponent({
      x: field.float32().default(0),
      y: field.float32().default(0),
    });

    Velocity = world.createComponent({
      dx: field.float32().default(0),
      dy: field.float32().default(0),
    });

    Health = world.createComponent({
      current: field.uint16().default(100),
      max: field.uint16().default(100),
    });
  });

  describe("Entity - Basic Operations", () => {
    let entity: Entity;

    beforeEach(() => {
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
      }).toThrow("Entity already has component:");
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
