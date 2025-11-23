import { describe, it, expect, beforeEach } from "vitest";
import { field, World, System } from "../src/index";

describe("World", () => {
  let Position: any;
  let Velocity: any;
  let Health: any;

  beforeEach(() => {
    const tempWorld = new World();

    // Define test components
    Position = tempWorld.createComponent({
      x: field.float32().default(0),
      y: field.float32().default(0),
    });

    Velocity = tempWorld.createComponent({
      dx: field.float32().default(0),
      dy: field.float32().default(0),
    });

    Health = tempWorld.createComponent({
      current: field.uint16().default(100),
      max: field.uint16().default(100),
    });
  });

  describe("Entity Management", () => {
    let doc: World;

    beforeEach(() => {
      doc = new World();
    });

    it("should create entities through entity manager", () => {
      const entity = doc.createEntity();

      expect(entity).toBeDefined();
    });

    it("should track multiple entities", () => {
      const e1 = doc.createEntity();
      const e2 = doc.createEntity();
      const e3 = doc.createEntity();

      expect(e1).toBeDefined();
      expect(e2).toBeDefined();
      expect(e3).toBeDefined();
    });

    it("should allow entities to use registered components", () => {
      const entity = doc.createEntity();

      // Should be able to add components that were registered
      doc.addComponent(entity, Position, { x: 10, y: 20 });
      doc.addComponent(entity, Velocity, { dx: 1, dy: 2 });

      expect(doc.hasComponent(entity, Position)).toBe(true);
      expect(doc.hasComponent(entity, Velocity)).toBe(true);
    });
  });

  describe("System Management", () => {
    class TestSystem extends System {
      public executed = false;

      execute(): void {
        this.executed = true;
      }
    }

    class AnotherSystem extends System {
      public value = 42;

      execute(): void {
        this.value++;
      }
    }

    it("should create world", () => {
      const doc = new World();
      expect(doc).toBeDefined();
    });

    it("should create systems via constructor", () => {
      const doc = new World();

      const testSystem = doc.createSystem(TestSystem);
      const anotherSystem = doc.createSystem(AnotherSystem);

      expect(testSystem).toBeInstanceOf(TestSystem);
      expect(anotherSystem).toBeInstanceOf(AnotherSystem);
    });

    it("should allow systems to be created", () => {
      const doc = new World();

      const system = doc.createSystem(TestSystem);

      // Systems are independent, entities created through world
      const entity = doc.createEntity();
      expect(entity).toBeDefined();
    });

    it("should allow systems to execute and maintain state", () => {
      const doc = new World();

      const testSystem = doc.createSystem(TestSystem);
      const anotherSystem = doc.createSystem(AnotherSystem);

      expect(testSystem.executed).toBe(false);
      expect(anotherSystem.value).toBe(42);

      doc.execute(testSystem);
      doc.execute(anotherSystem);

      expect(testSystem.executed).toBe(true);
      expect(anotherSystem.value).toBe(43);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle entity creation and component attachment", () => {
      const doc = new World();

      const entity = doc.createEntity();
      doc.addComponent(entity, Position, { x: 100, y: 200 });
      doc.addComponent(entity, Health, { current: 75, max: 100 });

      const pos = Position.read(entity);
      const health = Health.read(entity);

      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(200);
      expect(health.current).toBe(75);
      expect(health.max).toBe(100);
    });

    it("should handle component value mutations", () => {
      const doc = new World();

      const entity = doc.createEntity();
      doc.addComponent(entity, Position, { x: 0, y: 0 });
      doc.addComponent(entity, Velocity, { dx: 5, dy: 3 });

      const pos = Position.write(entity);
      const vel = Velocity.read(entity);

      // Simulate 10 frames of movement
      for (let i = 0; i < 10; i++) {
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(pos.x).toBeCloseTo(50);
      expect(pos.y).toBeCloseTo(30);
    });

    it("should handle many entities efficiently", () => {
      const doc = new World();

      // Create 100 entities
      for (let i = 0; i < 100; i++) {
        const entity = doc.createEntity();
        doc.addComponent(entity, Position, { x: i, y: i });

        if (i % 2 === 0) {
          doc.addComponent(entity, Health, { current: 100, max: 100 });
        }
      }
    });
  });
});
