import { describe, it, expect, beforeEach } from "vitest";
import { field, defineComponent, World } from "../src/index";

describe("World", () => {
  let Position: any;
  let Velocity: any;
  let Health: any;

  beforeEach(() => {
    // Define test components
    Position = defineComponent({
      x: field.float32().default(0),
      y: field.float32().default(0),
    });

    Velocity = defineComponent({
      dx: field.float32().default(0),
      dy: field.float32().default(0),
    });

    Health = defineComponent({
      current: field.uint16().default(100),
      max: field.uint16().default(100),
    });
  });

  describe("World Creation", () => {
    it("should create a world with no components", () => {
      const world = new World({});
      expect(world).toBeDefined();
      expect(world.components).toEqual({});
    });

    it("should create a world with components", () => {
      const world = new World({ Position, Velocity, Health });
      expect(world).toBeDefined();
      expect(world.components.Position).toBe(Position);
      expect(world.components.Velocity).toBe(Velocity);
      expect(world.components.Health).toBe(Health);
    });

    it("should initialize components with unique bitmasks", () => {
      const world = new World({ Position, Velocity, Health });
      expect(Position.bitmask).toBe(1); // 1 << 0
      expect(Velocity.bitmask).toBe(2); // 1 << 1
      expect(Health.bitmask).toBe(4); // 1 << 2
    });
  });

  describe("Entity Management", () => {
    it("should create entities", () => {
      const world = new World({});
      const eid = world.createEntity();

      expect(typeof eid).toBe("number");
    });

    it("should create multiple entities with sequential IDs", () => {
      const world = new World({});
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      const e3 = world.createEntity();

      expect(e1).toBe(0);
      expect(e2).toBe(1);
      expect(e3).toBe(2);
    });

    it("should remove entities", () => {
      const world = new World({ Position });
      const entity = world.createEntity();
      world.addComponent(entity, Position, { x: 10, y: 20 });

      world.removeEntity(entity);

      expect(() => world.hasComponent(entity, Position)).toThrow();
    });
  });

  describe("Component Operations", () => {
    it("should add components to entities", () => {
      const world = new World({ Position, Velocity });
      const entity = world.createEntity();

      world.addComponent(entity, Position, { x: 10, y: 20 });
      world.addComponent(entity, Velocity, { dx: 1, dy: 2 });

      expect(world.hasComponent(entity, Position)).toBe(true);
      expect(world.hasComponent(entity, Velocity)).toBe(true);
    });

    it("should add components with default values", () => {
      const world = new World({ Health });
      const entity = world.createEntity();

      world.addComponent(entity, Health, {});

      expect(world.hasComponent(entity, Health)).toBe(true);
      expect(Health.read(entity).current).toBe(100);
      expect(Health.read(entity).max).toBe(100);
    });

    it("should remove components from entities", () => {
      const world = new World({ Position, Velocity });
      const entity = world.createEntity();

      world.addComponent(entity, Position, { x: 10, y: 20 });
      world.addComponent(entity, Velocity, { dx: 1, dy: 2 });

      expect(world.hasComponent(entity, Position)).toBe(true);
      expect(world.hasComponent(entity, Velocity)).toBe(true);

      world.removeComponent(entity, Position);

      expect(world.hasComponent(entity, Position)).toBe(false);
      expect(world.hasComponent(entity, Velocity)).toBe(true);
    });

    it("should check for component existence", () => {
      const world = new World({ Position, Velocity });
      const entity = world.createEntity();

      expect(world.hasComponent(entity, Position)).toBe(false);

      world.addComponent(entity, Position, { x: 10, y: 20 });

      expect(world.hasComponent(entity, Position)).toBe(true);
      expect(world.hasComponent(entity, Velocity)).toBe(false);
    });

    it("should throw when checking component on non-existent entity", () => {
      const world = new World({ Position });

      expect(() => world.hasComponent(999, Position)).toThrow(
        "Entity with ID 999 does not exist"
      );
    });

    it("should throw when removing component from non-existent entity", () => {
      const world = new World({ Position });

      expect(() => world.removeComponent(999, Position)).toThrow(
        "Entity with ID 999 does not exist"
      );
    });
  });

  describe("Component Data Access", () => {
    it("should read component data", () => {
      const world = new World({ Position });
      const entity = world.createEntity();
      world.addComponent(entity, Position, { x: 100, y: 200 });

      const pos = Position.read(entity);

      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(200);
    });

    it("should write component data", () => {
      const world = new World({ Position });
      const entity = world.createEntity();
      world.addComponent(entity, Position, { x: 0, y: 0 });

      const pos = Position.write(entity);
      pos.x = 50;
      pos.y = 75;

      expect(Position.read(entity).x).toBeCloseTo(50);
      expect(Position.read(entity).y).toBeCloseTo(75);
    });

    it("should handle multiple components per entity", () => {
      const world = new World({ Position, Velocity, Health });
      const entity = world.createEntity();

      world.addComponent(entity, Position, { x: 100, y: 200 });
      world.addComponent(entity, Velocity, { dx: 5, dy: 10 });
      world.addComponent(entity, Health, { current: 75, max: 100 });

      const pos = Position.read(entity);
      const vel = Velocity.read(entity);
      const health = Health.read(entity);

      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(200);
      expect(vel.dx).toBeCloseTo(5);
      expect(vel.dy).toBeCloseTo(10);
      expect(health.current).toBe(75);
      expect(health.max).toBe(100);
    });

    it("should update component values independently", () => {
      const world = new World({ Position, Velocity });
      const entity = world.createEntity();

      world.addComponent(entity, Position, { x: 0, y: 0 });
      world.addComponent(entity, Velocity, { dx: 5, dy: 3 });

      // Simulate 10 frames of movement
      for (let i = 0; i < 10; i++) {
        const pos = Position.write(entity);
        const vel = Velocity.read(entity);
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(Position.read(entity).x).toBeCloseTo(50);
      expect(Position.read(entity).y).toBeCloseTo(30);
      expect(Velocity.read(entity).dx).toBeCloseTo(5);
      expect(Velocity.read(entity).dy).toBeCloseTo(3);
    });
  });

  describe("Multiple Entities", () => {
    it("should handle multiple entities with different component combinations", () => {
      const world = new World({ Position, Velocity, Health });

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });

      const e3 = world.createEntity();
      world.addComponent(e3, Velocity, { dx: 5, dy: 5 });
      world.addComponent(e3, Health, { current: 50, max: 100 });

      expect(world.hasComponent(e1, Position)).toBe(true);
      expect(world.hasComponent(e1, Velocity)).toBe(true);
      expect(world.hasComponent(e1, Health)).toBe(false);

      expect(world.hasComponent(e2, Position)).toBe(true);
      expect(world.hasComponent(e2, Velocity)).toBe(false);
      expect(world.hasComponent(e2, Health)).toBe(false);

      expect(world.hasComponent(e3, Position)).toBe(false);
      expect(world.hasComponent(e3, Velocity)).toBe(true);
      expect(world.hasComponent(e3, Health)).toBe(true);
    });

    it("should keep entity data isolated", () => {
      const world = new World({ Position });

      const e1 = world.createEntity();
      const e2 = world.createEntity();

      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e2, Position, { x: 30, y: 40 });

      Position.write(e1).x = 100;

      expect(Position.read(e1).x).toBeCloseTo(100);
      expect(Position.read(e2).x).toBeCloseTo(30);
    });
  });

  describe("World Disposal", () => {
    it("should dispose of world resources", () => {
      const world = new World({ Position });

      const entity = world.createEntity();
      world.addComponent(entity, Position, { x: 10, y: 20 });

      expect(() => world.dispose()).not.toThrow();
    });
  });
});
