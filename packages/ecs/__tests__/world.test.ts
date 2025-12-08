import { describe, it, expect } from "vitest";
import {
  field,
  defineComponent,
  World,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  useQuery,
} from "../src/index";

describe("World", () => {
  describe("World Creation", () => {
    it("should initialize components with unique componentIds", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });
      const Health = defineComponent("Health", {
        current: field.uint16().default(100),
        max: field.uint16().default(100),
      });

      const world = new World([Position, Velocity, Health]);
      const ctx = world.getContext();
      expect(Position.getComponentId(ctx)).toBe(0);
      expect(Velocity.getComponentId(ctx)).toBe(1);
      expect(Health.getComponentId(ctx)).toBe(2);
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

      expect(e1).toBe(0);
      expect(e2).toBe(1);
      expect(e3).toBe(2);
    });

    it("should remove entities", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

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
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 10, y: 20 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 2 });

      expect(hasComponent(ctx, entity, Position)).toBe(true);
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);
    });

    it("should add components with default values", () => {
      const Health = defineComponent("Health", {
        current: field.uint16().default(100),
        max: field.uint16().default(100),
      });

      const world = new World([Health]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Health, {});

      expect(hasComponent(ctx, entity, Health)).toBe(true);
      expect(Health.read(ctx, entity).current).toBe(100);
      expect(Health.read(ctx, entity).max).toBe(100);
    });

    it("should remove components from entities", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

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
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      expect(hasComponent(ctx, entity, Position)).toBe(false);

      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      expect(hasComponent(ctx, entity, Position)).toBe(true);
      expect(hasComponent(ctx, entity, Velocity)).toBe(false);
    });

    it("should throw when checking component on non-existent entity", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      expect(() => hasComponent(ctx, 999, Position)).toThrow(
        "Entity with ID 999 does not exist"
      );
    });

    it("should throw when removing component from non-existent entity", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      expect(() => removeComponent(ctx, 999, Position)).toThrow(
        "Entity with ID 999 does not exist"
      );
    });
  });

  describe("Component Data Access", () => {
    it("should read component data", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 100, y: 200 });

      const pos = Position.read(ctx, entity);

      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(200);
    });

    it("should write component data", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });

      const pos = Position.write(ctx, entity);
      pos.x = 50;
      pos.y = 75;

      expect(Position.read(ctx, entity).x).toBeCloseTo(50);
      expect(Position.read(ctx, entity).y).toBeCloseTo(75);
    });

    it("should handle multiple components per entity", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });
      const Health = defineComponent("Health", {
        current: field.uint16(),
        max: field.uint16(),
      });

      const world = new World([Position, Velocity, Health]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 100, y: 200 });
      addComponent(ctx, entity, Velocity, { dx: 5, dy: 10 });
      addComponent(ctx, entity, Health, { current: 75, max: 100 });

      const pos = Position.read(ctx, entity);
      const vel = Velocity.read(ctx, entity);
      const health = Health.read(ctx, entity);

      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(200);
      expect(vel.dx).toBeCloseTo(5);
      expect(vel.dy).toBeCloseTo(10);
      expect(health.current).toBe(75);
      expect(health.max).toBe(100);
    });

    it("should update component values independently", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();
      const entity = createEntity(ctx);

      addComponent(ctx, entity, Position, { x: 0, y: 0 });
      addComponent(ctx, entity, Velocity, { dx: 5, dy: 3 });

      // Simulate 10 frames of movement
      for (let i = 0; i < 10; i++) {
        const pos = Position.write(ctx, entity);
        const vel = Velocity.read(ctx, entity);
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(Position.read(ctx, entity).x).toBeCloseTo(50);
      expect(Position.read(ctx, entity).y).toBeCloseTo(30);
      expect(Velocity.read(ctx, entity).dx).toBeCloseTo(5);
      expect(Velocity.read(ctx, entity).dy).toBeCloseTo(3);
    });
  });

  describe("Multiple Entities", () => {
    it("should handle multiple entities with different component combinations", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });
      const Health = defineComponent("Health", {
        current: field.uint16(),
        max: field.uint16(),
      });

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
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const e1 = createEntity(ctx);
      const e2 = createEntity(ctx);

      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e2, Position, { x: 30, y: 40 });

      Position.write(ctx, e1).x = 100;

      expect(Position.read(ctx, e1).x).toBeCloseTo(100);
      expect(Position.read(ctx, e2).x).toBeCloseTo(30);
    });
  });

  describe("World Disposal", () => {
    it("should dispose of world resources", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      expect(() => world.dispose()).not.toThrow();
    });
  });

  describe("Multiple Worlds", () => {
    it("should allow multiple worlds to use the same ComponentDefs without interference", () => {
      // Define components once
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      // Create two separate worlds using the same component definitions
      const world1 = new World([Position, Velocity]);
      const ctx1 = world1.getContext();

      const world2 = new World([Position, Velocity]);
      const ctx2 = world2.getContext();

      // Create entities in world1
      const e1 = createEntity(ctx1);
      addComponent(ctx1, e1, Position, { x: 100, y: 200 });
      addComponent(ctx1, e1, Velocity, { dx: 1, dy: 2 });

      // Create entities in world2
      const e2 = createEntity(ctx2);
      addComponent(ctx2, e2, Position, { x: 300, y: 400 });
      addComponent(ctx2, e2, Velocity, { dx: 5, dy: 6 });

      // Verify data in world1 is independent
      expect(Position.read(ctx1, e1).x).toBeCloseTo(100);
      expect(Position.read(ctx1, e1).y).toBeCloseTo(200);
      expect(Velocity.read(ctx1, e1).dx).toBeCloseTo(1);
      expect(Velocity.read(ctx1, e1).dy).toBeCloseTo(2);

      // Verify data in world2 is independent
      expect(Position.read(ctx2, e2).x).toBeCloseTo(300);
      expect(Position.read(ctx2, e2).y).toBeCloseTo(400);
      expect(Velocity.read(ctx2, e2).dx).toBeCloseTo(5);
      expect(Velocity.read(ctx2, e2).dy).toBeCloseTo(6);

      // Modify data in world1 and verify world2 is unaffected
      Position.write(ctx1, e1).x = 999;
      expect(Position.read(ctx1, e1).x).toBeCloseTo(999);
      expect(Position.read(ctx2, e2).x).toBeCloseTo(300); // world2 unchanged

      // Modify data in world2 and verify world1 is unaffected
      Velocity.write(ctx2, e2).dx = 888;
      expect(Velocity.read(ctx2, e2).dx).toBeCloseTo(888);
      expect(Velocity.read(ctx1, e1).dx).toBeCloseTo(1); // world1 unchanged
    });

    it("should assign independent componentIds per world", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world1 = new World([Position, Velocity]);
      const ctx1 = world1.getContext();

      const world2 = new World([Velocity, Position]); // Different order
      const ctx2 = world2.getContext();

      // Each world assigns componentIds based on its own registration order
      expect(Position.getComponentId(ctx1)).toBe(0);
      expect(Velocity.getComponentId(ctx1)).toBe(1);

      expect(Velocity.getComponentId(ctx2)).toBe(0);
      expect(Position.getComponentId(ctx2)).toBe(1);
    });

    it("should allow entity creation in both worlds independently", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world1 = new World([Position]);
      const ctx1 = world1.getContext();

      const world2 = new World([Position]);
      const ctx2 = world2.getContext();

      // Create multiple entities in each world
      const w1e1 = createEntity(ctx1);
      const w1e2 = createEntity(ctx1);
      const w1e3 = createEntity(ctx1);

      const w2e1 = createEntity(ctx2);
      const w2e2 = createEntity(ctx2);

      // Entity IDs are per-world and start from 0
      expect(w1e1).toBe(0);
      expect(w1e2).toBe(1);
      expect(w1e3).toBe(2);

      expect(w2e1).toBe(0);
      expect(w2e2).toBe(1);

      // Add components with different values
      addComponent(ctx1, w1e1, Position, { x: 1, y: 1 });
      addComponent(ctx2, w2e1, Position, { x: 100, y: 100 });

      // Same entity ID (0) in different worlds has different data
      expect(Position.read(ctx1, w1e1).x).toBeCloseTo(1);
      expect(Position.read(ctx2, w2e1).x).toBeCloseTo(100);
    });

    it("should support queries on multiple worlds independently", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world1 = new World([Position, Velocity]);
      const ctx1 = world1.getContext();

      const world2 = new World([Position, Velocity]);
      const ctx2 = world2.getContext();

      // Create different entity configurations in each world
      // World1: 3 entities with Position, 2 with Velocity
      for (let i = 0; i < 3; i++) {
        const e = createEntity(ctx1);
        addComponent(ctx1, e, Position, { x: i, y: i });
        if (i < 2) {
          addComponent(ctx1, e, Velocity, { dx: i, dy: i });
        }
      }

      // World2: 5 entities with Position, all with Velocity
      for (let i = 0; i < 5; i++) {
        const e = createEntity(ctx2);
        addComponent(ctx2, e, Position, { x: i * 10, y: i * 10 });
        addComponent(ctx2, e, Velocity, { dx: i, dy: i });
      }

      // Single query definition works across multiple worlds
      // Each world gets its own Query instance stored in ctx.queries
      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Query results are per-context
      const world1Results = movingQuery.current(ctx1);
      const world2Results = movingQuery.current(ctx2);

      expect(world1Results).toHaveLength(2);
      expect(world2Results).toHaveLength(5);
    });
  });

  describe("Subscribe and Sync", () => {
    it("should emit 'added' when entity enters the query", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const query = useQuery((q) => q.with(Position));
      const receivedAdded: number[] = [];
      world.subscribe(query, ({ added }) => {
        receivedAdded.push(...added);
      });

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });
      world.sync();

      // Should receive 'added' when entity enters the query
      expect(receivedAdded).toHaveLength(1);
      expect(receivedAdded[0]).toBe(entity);
    });

    it("should not fire events for entities that do not match the query", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      // Query only for entities with Velocity
      const query = useQuery((q) => q.with(Velocity));
      const receivedAdded: number[] = [];
      world.subscribe(query, ({ added }) => {
        receivedAdded.push(...added);
      });

      // Create entity with only Position (should not match)
      const entity1 = createEntity(ctx);
      addComponent(ctx, entity1, Position, { x: 0, y: 0 });

      // Create entity with Velocity (should match)
      const entity2 = createEntity(ctx);
      addComponent(ctx, entity2, Velocity, { dx: 1, dy: 1 });

      world.sync();

      // Should only receive events for entity2
      expect(receivedAdded).toHaveLength(1);
      expect(receivedAdded[0]).toBe(entity2);
    });

    it("should emit 'removed' when entity leaves the query (entity deleted)", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });

      const query = useQuery((q) => q.with(Position));
      world.sync(); // Clear the initial events

      const receivedRemoved: number[] = [];
      world.subscribe(query, ({ removed }) => {
        receivedRemoved.push(...removed);
      });

      removeEntity(ctx, entity);
      world.sync();

      expect(receivedRemoved).toHaveLength(1);
      expect(receivedRemoved[0]).toBe(entity);
    });

    it("should emit 'removed' when entity leaves the query (component removed)", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 1 });

      // Query for entities with both Position AND Velocity
      const query = useQuery((q) => q.with(Position, Velocity));
      world.sync(); // Clear initial events

      const receivedRemoved: number[] = [];
      world.subscribe(query, ({ removed }) => {
        receivedRemoved.push(...removed);
      });

      // Remove Velocity - entity should leave the query
      removeComponent(ctx, entity, Velocity);
      world.sync();

      expect(receivedRemoved).toHaveLength(1);
      expect(receivedRemoved[0]).toBe(entity);
    });

    it("should emit 'added' when entity enters the query (component added)", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });

      // Query for entities with both Position AND Velocity
      const query = useQuery((q) => q.with(Position, Velocity));
      world.sync(); // Clear initial events

      const receivedAdded: number[] = [];
      world.subscribe(query, ({ added }) => {
        receivedAdded.push(...added);
      });

      // Add Velocity - entity should enter the query
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 1 });
      world.sync();

      expect(receivedAdded).toHaveLength(1);
      expect(receivedAdded[0]).toBe(entity);
    });

    it("should emit 'changed' when tracked component changes", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });

      // Use tracking() to track Position changes
      const query = useQuery((q) => q.with(Position).tracking(Position));
      world.sync(); // Clear the initial events

      const receivedChanged: number[] = [];
      world.subscribe(query, ({ changed }) => {
        receivedChanged.push(...changed);
      });

      // Modify the component
      const pos = Position.write(ctx, entity);
      pos.x = 100;
      world.sync();

      expect(receivedChanged).toHaveLength(1);
      expect(receivedChanged[0]).toBe(entity);
    });

    it("should not emit 'changed' for non-tracked components", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 1 });

      // Query with Position but only track Velocity
      const query = useQuery((q) =>
        q.with(Position, Velocity).tracking(Velocity)
      );
      world.sync(); // Clear the initial events

      const receivedChanged: number[] = [];
      world.subscribe(query, ({ changed }) => {
        receivedChanged.push(...changed);
      });

      // Modify Position (not tracked) - should not emit
      const pos = Position.write(ctx, entity);
      pos.x = 100;
      world.sync();

      expect(receivedChanged).toHaveLength(0);

      // Modify Velocity (tracked) - should emit
      const vel = Velocity.write(ctx, entity);
      vel.dx = 50;
      world.sync();

      expect(receivedChanged).toHaveLength(1);
      expect(receivedChanged[0]).toBe(entity);
    });

    it("should support multiple subscribers with different queries", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const positionQuery = useQuery((q) => q.with(Position));
      const velocityQuery = useQuery((q) => q.with(Velocity));

      const positionAdded: number[] = [];
      const velocityAdded: number[] = [];

      world.subscribe(positionQuery, ({ added }) => {
        positionAdded.push(...added);
      });
      world.subscribe(velocityQuery, ({ added }) => {
        velocityAdded.push(...added);
      });

      // Create entity with only Position
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 0, y: 0 });

      // Create entity with only Velocity
      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Velocity, { dx: 1, dy: 1 });

      world.sync();

      // Position subscriber should only see e1
      expect(positionAdded).toHaveLength(1);
      expect(positionAdded[0]).toBe(e1);

      // Velocity subscriber should only see e2
      expect(velocityAdded).toHaveLength(1);
      expect(velocityAdded[0]).toBe(e2);
    });

    it("should support unsubscribing", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const query = useQuery((q) => q.with(Position));
      const receivedAdded: number[] = [];
      const unsubscribe = world.subscribe(query, ({ added }) => {
        receivedAdded.push(...added);
      });

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 0, y: 0 });
      world.sync();
      expect(receivedAdded).toHaveLength(1);

      unsubscribe();

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 0, y: 0 });
      world.sync();
      // Should still be 1 since we unsubscribed
      expect(receivedAdded).toHaveLength(1);
    });

    it("should not call subscribers if no matching events occurred", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      // Subscribe only to Velocity entities
      const query = useQuery((q) => q.with(Velocity));
      let callCount = 0;
      world.subscribe(query, () => {
        callCount++;
      });

      // Create entity with only Position (doesn't match query)
      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });

      world.sync();
      world.sync();
      world.sync();

      expect(callCount).toBe(0);
    });

    it("should batch multiple 'added' events in a single sync call", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const query = useQuery((q) => q.with(Position));
      const receivedBatches: number[][] = [];
      world.subscribe(query, ({ added }) => {
        receivedBatches.push([...added]);
      });

      // Create multiple entities before syncing
      const e1 = createEntity(ctx);
      const e2 = createEntity(ctx);
      const e3 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 0, y: 0 });
      addComponent(ctx, e2, Position, { x: 0, y: 0 });
      addComponent(ctx, e3, Position, { x: 0, y: 0 });

      world.sync();

      // Should have received one batch with 3 'added' entities
      expect(receivedBatches).toHaveLength(1);
      expect(receivedBatches[0]).toHaveLength(3);
    });

    it("should only emit 'added' once per entity even with multiple component adds", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      // Query that matches when entity has Position
      const query = useQuery((q) => q.with(Position));
      const receivedAdded: number[] = [];
      world.subscribe(query, ({ added }) => {
        receivedAdded.push(...added);
      });

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 0, y: 0 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 1 }); // Adding more components
      world.sync();

      // Should only get one 'added' entity
      expect(receivedAdded).toHaveLength(1);
    });
  });

  describe("Deferred Command Buffer", () => {
    it("should defer removeEntity when called outside of execute", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      // Set isExecuting to false to simulate being outside execute()
      ctx.isExecuting = false;

      // This should be deferred, not executed immediately
      removeEntity(ctx, entity);

      // Entity should still exist
      expect(ctx.entityBuffer.has(entity)).toBe(true);

      // Flush the commands via sync()
      world.sync();

      // Now entity should be removed
      expect(ctx.entityBuffer.has(entity)).toBe(false);
    });

    it("should defer addComponent when called outside of execute", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      // Set isExecuting to false to simulate being outside execute()
      ctx.isExecuting = false;

      // This should be deferred
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 2 });

      // Entity should NOT have Velocity yet
      expect(hasComponent(ctx, entity, Velocity)).toBe(false);

      // Flush the commands via sync()
      world.sync();

      // Now entity should have Velocity
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);
      expect(Velocity.read(ctx, entity).dx).toBeCloseTo(1);
      expect(Velocity.read(ctx, entity).dy).toBeCloseTo(2);
    });

    it("should defer removeComponent when called outside of execute", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 2 });

      // Set isExecuting to false to simulate being outside execute()
      ctx.isExecuting = false;

      // This should be deferred
      removeComponent(ctx, entity, Velocity);

      // Entity should still have Velocity
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);

      // Flush the commands via sync()
      world.sync();

      // Now entity should NOT have Velocity
      expect(hasComponent(ctx, entity, Velocity)).toBe(false);
      // But should still have Position
      expect(hasComponent(ctx, entity, Position)).toBe(true);
    });

    it("should execute commands immediately when isExecuting is true", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);

      // isExecuting starts as true, so this should execute immediately
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      // Component should be added immediately
      expect(hasComponent(ctx, entity, Position)).toBe(true);
      expect(Position.read(ctx, entity).x).toBeCloseTo(10);
    });

    it("should process multiple deferred commands in order", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });

      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      // Set isExecuting to false
      ctx.isExecuting = false;

      // Queue multiple commands
      addComponent(ctx, entity, Velocity, { dx: 1, dy: 2 });
      removeComponent(ctx, entity, Position);

      // Neither should have happened yet
      expect(hasComponent(ctx, entity, Velocity)).toBe(false);
      expect(hasComponent(ctx, entity, Position)).toBe(true);

      // Flush
      world.sync();

      // Both should have happened
      expect(hasComponent(ctx, entity, Velocity)).toBe(true);
      expect(hasComponent(ctx, entity, Position)).toBe(false);
    });

    it("should trigger subscriber callbacks for deferred commands", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position]);
      const ctx = world.getContext();

      const entity = createEntity(ctx);
      addComponent(ctx, entity, Position, { x: 10, y: 20 });

      const query = useQuery((q) => q.with(Position));
      world.sync(); // Clear initial events

      const removedEntities: number[] = [];
      world.subscribe(query, ({ removed }) => {
        removedEntities.push(...removed);
      });

      // Set isExecuting to false
      ctx.isExecuting = false;

      // Defer removal
      removeEntity(ctx, entity);

      // Callback should not have been called yet
      expect(removedEntities).toHaveLength(0);

      // Flush
      world.sync();

      // Now callback should have been called
      expect(removedEntities).toHaveLength(1);
      expect(removedEntities[0]).toBe(entity);
    });
  });
});
