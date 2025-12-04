import { describe, it, expect, beforeEach } from "vitest";
import {
  field,
  defineComponent,
  World,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
} from "../src/index";

describe("World", () => {
  let Position: any;
  let Velocity: any;
  let Health: any;

  beforeEach(() => {
    // Define test components
    Position = defineComponent("Position", {
      x: field.float32().default(0),
      y: field.float32().default(0),
    });

    Velocity = defineComponent("Velocity", {
      dx: field.float32().default(0),
      dy: field.float32().default(0),
    });

    Health = defineComponent("Health", {
      current: field.uint16().default(100),
      max: field.uint16().default(100),
    });
  });

  describe("World Creation", () => {
    it("should initialize components with unique componentIds", () => {
      new World([Position, Velocity, Health]);
      expect(Position.componentId).toBe(0);
      expect(Velocity.componentId).toBe(1);
      expect(Health.componentId).toBe(2);
    });
  });

  describe("Entity Management", () => {
    it("should create entities", () => {
      const world = new World([]);
      const ctx = world.getContext();
      const eid = createEntity(ctx);

      expect(typeof eid).toBe("number");
    });

    it("should create multiple entities with sequential IDs", () => {
      const world = new World([]);
      const ctx = world.getContext();
      const e1 = createEntity(ctx);
      const e2 = createEntity(ctx);
      const e3 = createEntity(ctx);

      // Entity IDs start at 1 (index 0 is reserved for buffer metadata)
      expect(e1).toBe(1);
      expect(e2).toBe(2);
      expect(e3).toBe(3);
    });

    it("should remove entities", () => {
      const world = new World([Position]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      removeEntity(ctx, entity);

      expect(() => hasComponent(ctx, entity, Position)).toThrow();
    });
  });

  describe("Component Operations", () => {
    it("should add components to entities", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 10, y: 20 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 2 });

      expect(hasComponent(ctx, entity, Position)).toBe(true);
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);
    });

    it("should add components with default values", () => {
      const world = new World([Health]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Health, {});

      expect(hasComponent(ctx, entity, Health)).toBe(true);
      expect(Health.read(entity).current).toBe(100);
      expect(Health.read(entity).max).toBe(100);
    });

    it("should remove components from entities", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 10, y: 20 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 2 });

      expect(hasComponent(ctx, entity, Position)).toBe(true);
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);

      removeComponent(ctx, entity, Position);

      expect(hasComponent(ctx, entity, Position)).toBe(false);
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);
    });

    it("should check for component existence", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      expect(hasComponent(ctx, entity, Position)).toBe(false);

      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      expect(hasComponent(ctx, entity, Position)).toBe(true);
      expect(hasComponent(ctx, entity, Velocity)).toBe(false);
    });

    it("should throw when checking component on non-existent entity", () => {
      const world = new World([Position]);
      const ctx = world.getContext();

      expect(() => hasComponent(ctx, 999, Position)).toThrow(
        "Entity with ID 999 does not exist"
      );
    });

    it("should throw when removing component from non-existent entity", () => {
      const world = new World([Position]);
      const ctx = world.getContext();

      expect(() => removeComponent(ctx, 999, Position)).toThrow(
        "Entity with ID 999 does not exist"
      );
    });
  });

  describe("Component Data Access", () => {
    it("should read component data", () => {
      const world = new World([Position]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 100, y: 200 });

      const pos = Position.read(entity);

      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(200);
    });

    it("should write component data", () => {
      const world = new World([Position]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });

      const pos = Position.write(entity);
      pos.x = 50;
      pos.y = 75;

      expect(Position.read(entity).x).toBeCloseTo(50);
      expect(Position.read(entity).y).toBeCloseTo(75);
    });

    it("should handle multiple components per entity", () => {
      const world = new World([Position, Velocity, Health]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 100, y: 200 });
      addComponent(ctx, entity, Velocity, { dx: 5, dy: 10 });
      addComponent(ctx, entity, Health, { current: 75, max: 100 });

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
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 0, y: 0 });
      addComponent(ctx, entity, Velocity, { dx: 5, dy: 3 });

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
      const world = new World([Position, Velocity, Health]);
      const ctx = world.getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 2 });

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 30, y: 40 });

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Velocity, { dx: 5, dy: 5 });
      addComponent(ctx, e3, Health, { current: 50, max: 100 });

      expect(hasComponent(ctx, e1, Position)).toBe(true);
      expect(hasComponent(ctx, e1, Velocity)).toBe(true);
      expect(hasComponent(ctx, e1, Health)).toBe(false);

      expect(hasComponent(ctx, e2, Position)).toBe(true);
      expect(hasComponent(ctx, e2, Velocity)).toBe(false);
      expect(hasComponent(ctx, e2, Health)).toBe(false);

      expect(hasComponent(ctx, e3, Position)).toBe(false);
      expect(hasComponent(ctx, e3, Velocity)).toBe(true);
      expect(hasComponent(ctx, e3, Health)).toBe(true);
    });

    it("should keep entity data isolated", () => {
      const world = new World([Position]);
      const ctx = world.getContext();

      const e1 = createEntity(ctx);
      const e2 = createEntity(ctx);

      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e2, Position, { x: 30, y: 40 });

      Position.write(e1).x = 100;

      expect(Position.read(e1).x).toBeCloseTo(100);
      expect(Position.read(e2).x).toBeCloseTo(30);
    });
  });

  describe("World Disposal", () => {
    it("should dispose of world resources", () => {
      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      expect(() => world.dispose()).not.toThrow();
    });
  });
});
