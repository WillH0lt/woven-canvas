import { describe, it, expect, beforeEach } from "vitest";
import { field, World } from "../src/index";
import type { EntityId } from "../src/index";

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
    let entity: EntityId;

    beforeEach(() => {
      entity = world.createEntity();
    });

    it("should add a component to entity", () => {
      world.addComponent(entity, Position, { x: 10, y: 20 });
      const pos = Position.read(entity);

      expect(pos.x).toBeCloseTo(10);
      expect(pos.y).toBeCloseTo(20);
      expect(world.hasComponent(entity, Position)).toBe(true);
    });

    it("should throw error when adding duplicate component", () => {
      world.addComponent(entity, Position, { x: 10, y: 20 });

      expect(() => {
        world.addComponent(entity, Position, { x: 30, y: 40 });
      }).toThrow("Entity already has component:");
    });

    it("should get a component from entity", () => {
      world.addComponent(entity, Position, { x: 15, y: 25 });

      const pos = Position.read(entity);
      expect(pos).toBeDefined();
      expect(pos!.x).toBeCloseTo(15);
      expect(pos!.y).toBeCloseTo(25);
    });

    it("should check hasComponent before reading", () => {
      expect(world.hasComponent(entity, Position)).toBe(false);

      world.addComponent(entity, Position, { x: 5, y: 10 });
      expect(world.hasComponent(entity, Position)).toBe(true);

      const pos = Position.read(entity);
      expect(pos.x).toBeCloseTo(5);
      expect(pos.y).toBeCloseTo(10);
    });

    it("should remove a component", () => {
      world.addComponent(entity, Position, { x: 10, y: 20 });
      expect(world.hasComponent(entity, Position)).toBe(true);

      world.removeComponent(entity, Position);
      expect(world.hasComponent(entity, Position)).toBe(false);
    });

    it("should add multiple components", () => {
      world.addComponent(entity, Position, { x: 10, y: 20 });
      world.addComponent(entity, Velocity, { dx: 1, dy: 2 });
      world.addComponent(entity, Health, { current: 80, max: 100 });

      expect(world.hasComponent(entity, Position)).toBe(true);
      expect(world.hasComponent(entity, Velocity)).toBe(true);
      expect(world.hasComponent(entity, Health)).toBe(true);
    });
  });

  describe("World", () => {
    it("should remove entity by instance", () => {
      const entity = world.createEntity();
      world.addComponent(entity, Position, { x: 10, y: 20 });

      expect(world.hasComponent(entity, Position)).toBe(true);

      world.removeEntity(entity);
      expect(() => world.hasComponent(entity, Position)).toThrow(
        "Entity with ID"
      );
    });

    it("should handle removing non-existent entity", () => {
      const otherWorld = new World();
      const entity = otherWorld.createEntity();

      // Entity from another world won't exist in this world
      world.removeEntity(entity);
      // hasComponent should throw for non-existent entity
      expect(() => world.hasComponent(entity, Position)).toThrow(
        "Entity with ID"
      );
    });
  });

  describe("Real-World Usage", () => {
    it("should handle component lifecycle", () => {
      const entity = world.createEntity();
      world.addComponent(entity, Health, { current: 100, max: 100 });

      // Take damage
      const health = Health.write(entity);
      health.current -= 50;

      expect(health.current).toBe(50);

      // If health reaches 0, remove health component
      health.current = 0;

      if (health.current <= 0) {
        world.removeComponent(entity, Health);
      }

      expect(world.hasComponent(entity, Health)).toBe(false);
    });
  });
});
