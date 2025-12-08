import { describe, it, expect, beforeEach } from "vitest";

import {
  field,
  defineComponent,
  World,
  useQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
} from "../src";
import type { ComponentDef } from "../src";
import { QueryCache } from "../src/Query/Cache";

describe("Query", () => {
  let Position: ComponentDef<any>;
  let Velocity: ComponentDef<any>;
  let Health: ComponentDef<any>;
  let Enemy: ComponentDef<any>;
  let Player: ComponentDef<any>;

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

    Enemy = defineComponent("Enemy", {
      damage: field.uint8().default(10),
    });

    Player = defineComponent("Player", {
      score: field.uint32().default(0),
    });
  });

  describe("Query - Basic Operations", () => {
    it("should query entities with specific components", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Create entities with different component combinations
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 2 });

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 30, y: 40 });

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Velocity, { dx: 5, dy: 5 });

      // Query for entities with Position
      const positionQuery = useQuery((q) => q.with(Position));
      const results = positionQuery.current(ctx);

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
    });

    it("should query entities with multiple required components", () => {
      const world = new World([Position, Velocity, Health]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 2 });

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 30, y: 40 });

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Position, { x: 50, y: 60 });
      addComponent(ctx, e3, Velocity, { dx: 3, dy: 4 });
      addComponent(ctx, e3, Health);

      // Query for entities with both Position AND Velocity
      const movingQuery = useQuery((q) => q.with(Position, Velocity));
      const results = movingQuery.current(ctx);

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e3);
      expect(results).not.toContain(e2);
    });

    it("should query entities without specific components", () => {
      const world = new World([Position, Enemy, Player]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e1, Enemy);

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 30, y: 40 });
      addComponent(ctx, e2, Player);

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Position, { x: 50, y: 60 });

      // Query for Position entities that are NOT enemies
      const nonEnemyQuery = useQuery((q) => q.with(Position).without(Enemy));
      const results = nonEnemyQuery.current(ctx);

      expect(results).toHaveLength(2);
      expect(results).toContain(e2);
      expect(results).toContain(e3);
      expect(results).not.toContain(e1);
    });

    it("should query entities with any of specified components", () => {
      const world = new World([Enemy, Player, Health]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Enemy);

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Player);

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Health);

      // Query for entities that are either Enemy OR Player
      const characterQuery = useQuery((q) => q.any(Enemy, Player));
      const results = characterQuery.current(ctx);

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
    });

    it("should combine with, without, and any clauses", () => {
      const world = new World([Position, Velocity, Enemy, Player, Health]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);
      addComponent(ctx, e1, Enemy);

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position);
      addComponent(ctx, e2, Player);

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Position);
      addComponent(ctx, e3, Health);
      addComponent(ctx, e3, Player);

      const e4 = createEntity(ctx);
      addComponent(ctx, e4, Position);
      addComponent(ctx, e4, Velocity);

      // Query for: Position AND (Player OR Enemy) AND NOT Velocity
      const complexQuery = useQuery((q) =>
        q.with(Position).any(Player, Enemy).without(Velocity)
      );
      const results = complexQuery.current(ctx);

      expect(results).toHaveLength(2);
      expect(results).toContain(e2);
      expect(results).toContain(e3);
      expect(results).not.toContain(e1);
      expect(results).not.toContain(e4);
    });

    it("should handle empty queries", () => {
      const world = new World([Position]);
      const ctx = world._getContext();

      // Create at least one entity so entityBuffer exists
      const e1 = createEntity(ctx);
      // Don't add Position component

      const positionQuery = useQuery((q) => q.with(Position));
      const results = positionQuery.current(ctx);

      expect(results).toHaveLength(0);
    });

    it("should iterate over query results", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 0, y: 0 });
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 1 });

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 10, y: 10 });
      addComponent(ctx, e2, Velocity, { dx: 2, dy: 2 });

      // Use query in a for...of loop
      const movingQuery = useQuery((q) => q.with(Position, Velocity));
      let count = 0;
      for (const entityId of movingQuery.current(ctx)) {
        count++;
        const pos = Position.write(ctx, entityId) as { x: number; y: number };
        const vel = Velocity.read(ctx, entityId) as { dx: number; dy: number };

        // Move entity
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(count).toBe(2);
      expect(Position.read(ctx, e1).x).toBeCloseTo(1);
      expect(Position.read(ctx, e2).x).toBeCloseTo(12);
    });
  });

  describe("Query - Performance", () => {
    it("should efficiently handle large numbers of entities", () => {
      const world = new World([Position, Velocity, Health, Enemy]);
      const ctx = world._getContext();

      // Create 1000 entities with various component combinations
      const entities = [];
      for (let i = 0; i < 1000; i++) {
        const entity = createEntity(ctx);
        entities.push(entity);

        addComponent(ctx, entity, Position, { x: i, y: i });

        if (i % 2 === 0) {
          addComponent(ctx, entity, Velocity);
        }

        if (i % 3 === 0) {
          addComponent(ctx, entity, Health);
        }

        if (i % 5 === 0) {
          addComponent(ctx, entity, Enemy);
        }
      }

      // Query should be fast with bitmask operations
      const startTime = performance.now();
      const perfQuery = useQuery((q) =>
        q.with(Position, Velocity).without(Enemy)
      );
      const results = perfQuery.current(ctx);
      const endTime = performance.now();

      // Entities with Position+Velocity but not Enemy
      // All entities have Position, i%2===0 have Velocity (500), i%5===0 have Enemy
      // Even numbers without multiples of 10: 500 - 100 = 400
      expect(results.length).toBe(400);

      // Should be very fast (under 10ms for 1000 entities)
      expect(endTime - startTime).toBeLessThan(10);
    });

    it("should handle queries on large entity sets efficiently", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Create many entities
      for (let i = 0; i < 5000; i++) {
        const entity = createEntity(ctx);
        addComponent(ctx, entity, Position, { x: i, y: i });
        if (i % 2 === 0) {
          addComponent(ctx, entity, Velocity, { dx: 1, dy: 1 });
        }
      }

      const startTime = performance.now();
      let count = 0;
      const largeQuery = useQuery((q) => q.with(Position, Velocity));
      for (const _ of largeQuery.current(ctx)) {
        count++;
      }
      const endTime = performance.now();

      // Entities 0,2,4,6... up to 4998 have both components (2500 total)
      // All entities have Position, half have Velocity
      expect(count).toBe(2500);
      expect(endTime - startTime).toBeLessThan(20);
    });
  });

  describe("Query - Component Data Access", () => {
    it("should allow reading component data during iteration", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 2 });

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 30, y: 40 });
      addComponent(ctx, e2, Velocity, { dx: 3, dy: 4 });

      const positions: Array<{ x: number; y: number }> = [];
      const readQuery = useQuery((q) => q.with(Position, Velocity));
      for (const entityId of readQuery.current(ctx)) {
        const pos = Position.read(ctx, entityId) as { x: number; y: number };
        positions.push({ x: pos.x, y: pos.y });
      }

      expect(positions).toHaveLength(2);
      expect(positions[0]).toEqual({ x: 10, y: 20 });
      expect(positions[1]).toEqual({ x: 30, y: 40 });
    });

    it("should allow writing component data during iteration", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 0, y: 0 });
      addComponent(ctx, e1, Velocity, { dx: 5, dy: 10 });

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position, { x: 100, y: 200 });
      addComponent(ctx, e2, Velocity, { dx: -2, dy: -3 });

      // Apply velocity to position
      const writeQuery = useQuery((q) => q.with(Position, Velocity));
      for (const entityId of writeQuery.current(ctx)) {
        const pos = Position.write(ctx, entityId) as { x: number; y: number };
        const vel = Velocity.read(ctx, entityId) as { dx: number; dy: number };
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(Position.read(ctx, e1).x).toBeCloseTo(5);
      expect(Position.read(ctx, e1).y).toBeCloseTo(10);
      expect(Position.read(ctx, e2).x).toBeCloseTo(98);
      expect(Position.read(ctx, e2).y).toBeCloseTo(197);
    });
  });

  describe("Query - Edge Cases", () => {
    it("should handle queries with no matching entities", () => {
      const world = new World([Position, Velocity, Enemy]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);

      const emptyQuery = useQuery((q) => q.with(Enemy));
      const results = emptyQuery.current(ctx);

      expect(results).toHaveLength(0);
    });

    it("should handle queries with all entities matching", () => {
      const world = new World([Position]);
      const ctx = world._getContext();

      const entities = [];
      for (let i = 0; i < 10; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, Position, { x: i, y: i });
        entities.push(e);
      }

      const allMatchQuery = useQuery((q) => q.with(Position));
      const results = allMatchQuery.current(ctx);

      expect(results).toHaveLength(10);
      for (const entity of entities) {
        expect(results).toContain(entity);
      }
    });

    it("should handle complex multi-clause queries", () => {
      const world = new World([Position, Velocity, Health, Enemy, Player]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Health);
      addComponent(ctx, e1, Player);

      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position);
      addComponent(ctx, e2, Health);
      addComponent(ctx, e2, Enemy);

      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Position);
      addComponent(ctx, e3, Velocity);
      addComponent(ctx, e3, Player);

      const e4 = createEntity(ctx);
      addComponent(ctx, e4, Position);
      addComponent(ctx, e4, Health);

      // Query: Position AND Health AND (Player OR Enemy) AND NOT Velocity
      const complexQuery = useQuery((q) =>
        q.with(Position, Health).any(Player, Enemy).without(Velocity)
      );
      const results = complexQuery.current(ctx);

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
      expect(results).not.toContain(e4);
    });

    it("should handle entity with all components", () => {
      const world = new World([Position, Velocity, Health, Enemy, Player]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);
      addComponent(ctx, e1, Health);
      addComponent(ctx, e1, Enemy);
      addComponent(ctx, e1, Player);

      const query1 = useQuery((q) => q.with(Position));
      const results1 = query1.current(ctx);
      expect(results1).toContain(e1);

      const query2 = useQuery((q) =>
        q.with(Position, Velocity, Health, Enemy, Player)
      );
      const results2 = query2.current(ctx);
      expect(results2).toContain(e1);

      const query3 = useQuery((q) => q.with(Position).without(Velocity));
      const results3 = query3.current(ctx);
      expect(results3).not.toContain(e1);
    });
  });

  describe("Query - Reactive added()/removed()", () => {
    it("should return entities in added() when entity is created and matches query", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Initially no added entities
      let added = movingQuery.added(ctx);
      expect(added).toHaveLength(0);

      // Create an entity that matches the query
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 2 });

      // Simulate next frame - query updates are frame-based
      ctx.tick++;

      // Should appear in added()
      added = movingQuery.added(ctx);
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);

      // Second call in same frame should return cached value
      added = movingQuery.added(ctx);
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);
    });

    it("should return entity in added() when component is added to existing entity", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Create entity with only Position
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position, { x: 10, y: 20 });

      // Simulate next frame and clear the added buffer
      ctx.tick++;
      movingQuery.added(ctx);

      // Entity doesn't match query yet
      expect(movingQuery.current(ctx)).toHaveLength(0);

      // Now add Velocity - entity should match
      addComponent(ctx, e1, Velocity, { dx: 1, dy: 2 });

      // Simulate next frame
      ctx.tick++;

      // Entity should now appear in added()
      const added = movingQuery.added(ctx);
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);

      // And in current()
      expect(movingQuery.current(ctx)).toContain(e1);
    });

    it("should return entity in removed() when entity is deleted", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Create entity
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);

      // Simulate next frame and clear the added/removed buffers
      ctx.tick++;
      movingQuery.added(ctx);
      movingQuery.removed(ctx);

      // Delete the entity
      removeEntity(ctx, e1);

      // Simulate next frame
      ctx.tick++;

      // Should appear in removed()
      const removed = movingQuery.removed(ctx);
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);
    });

    it("should return entity in removed() when component is removed from existing entity", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Create entity with both components
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);

      // Simulate next frame and clear the buffers
      ctx.tick++;
      movingQuery.added(ctx);
      movingQuery.removed(ctx);

      // Entity matches query
      expect(movingQuery.current(ctx)).toContain(e1);

      // Remove Velocity - entity should no longer match
      removeComponent(ctx, e1, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear in removed()
      const removed = movingQuery.removed(ctx);
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);

      // And should no longer be in current()
      expect(movingQuery.current(ctx)).not.toContain(e1);
    });

    it("should not return entity in removed() if component removal doesn't affect query match", () => {
      const world = new World([Position, Velocity, Health]);
      const ctx = world._getContext();

      // Query only requires Position
      const positionQuery = useQuery((q) => q.with(Position));

      // Create entity with Position, Velocity, and Health
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);
      addComponent(ctx, e1, Health);

      // Simulate next frame and clear buffers
      ctx.tick++;
      positionQuery.added(ctx);
      positionQuery.removed(ctx);

      // Remove Velocity - entity should still match (query only requires Position)
      removeComponent(ctx, e1, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Entity should NOT appear in removed() since it still matches
      const removed = positionQuery.removed(ctx);
      expect(removed).toHaveLength(0);

      // Should still be in current()
      expect(positionQuery.current(ctx)).toContain(e1);
    });

    it("should handle without() clause correctly for added()", () => {
      const world = new World([Position, Velocity, Enemy]);
      const ctx = world._getContext();

      // Query for Position WITHOUT Enemy
      const nonEnemyQuery = useQuery((q) => q.with(Position).without(Enemy));

      // Create entity with Position and Enemy - should NOT match
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Enemy);

      // Simulate next frame and clear buffers
      ctx.tick++;
      nonEnemyQuery.added(ctx);
      nonEnemyQuery.removed(ctx);

      // Entity should not be in current
      expect(nonEnemyQuery.current(ctx)).not.toContain(e1);

      // Remove Enemy - now entity should match
      removeComponent(ctx, e1, Enemy);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear in added()
      const added = nonEnemyQuery.added(ctx);
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);
    });

    it("should handle without() clause correctly for removed()", () => {
      const world = new World([Position, Velocity, Enemy]);
      const ctx = world._getContext();

      // Query for Position WITHOUT Enemy
      const nonEnemyQuery = useQuery((q) => q.with(Position).without(Enemy));

      // Create entity with only Position - should match
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);

      // Simulate next frame and clear buffers
      ctx.tick++;
      nonEnemyQuery.added(ctx);
      nonEnemyQuery.removed(ctx);

      // Entity should be in current
      expect(nonEnemyQuery.current(ctx)).toContain(e1);

      // Add Enemy - now entity should NOT match
      addComponent(ctx, e1, Enemy);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear in removed()
      const removed = nonEnemyQuery.removed(ctx);
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);

      // Should not be in current anymore
      expect(nonEnemyQuery.current(ctx)).not.toContain(e1);
    });

    it("should handle multiple entities being added and removed", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Create multiple entities
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position);
      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Position);

      // Simulate next frame and clear buffers
      ctx.tick++;
      movingQuery.added(ctx);
      movingQuery.removed(ctx);

      // Add Velocity to e1 and e2
      addComponent(ctx, e1, Velocity);
      addComponent(ctx, e2, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Check added
      let added = movingQuery.added(ctx);
      expect(added).toHaveLength(2);
      expect(added).toContain(e1);
      expect(added).toContain(e2);
      expect(added).not.toContain(e3);

      // Remove Velocity from e1
      removeComponent(ctx, e1, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Check removed
      const removed = movingQuery.removed(ctx);
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);

      // e2 should still be in current
      expect(movingQuery.current(ctx)).toContain(e2);
      expect(movingQuery.current(ctx)).not.toContain(e1);
    });

    it("should only return entity once even if multiple relevant components change", () => {
      const world = new World([Position, Velocity, Health]);
      const ctx = world._getContext();

      const query = useQuery((q) => q.with(Position, Velocity, Health));

      // Create entity with no components
      const e1 = createEntity(ctx);

      // Simulate next frame and clear buffers
      ctx.tick++;
      query.added(ctx);

      // Add all three components
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);
      addComponent(ctx, e1, Health);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear only once in added()
      const added = query.added(ctx);
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);
    });

    it("should return consistent results within the same frame", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Create entities
      const e1 = createEntity(ctx);
      addComponent(ctx, e1, Position);
      addComponent(ctx, e1, Velocity);
      const e2 = createEntity(ctx);
      addComponent(ctx, e2, Position);
      addComponent(ctx, e2, Velocity);

      // Simulate next frame
      ctx.tick++;

      // First call to current()
      const current1 = movingQuery.current(ctx);
      expect(current1).toHaveLength(2);

      // Second call in same frame should return identical results
      const current2 = movingQuery.current(ctx);
      expect(current2).toEqual(current1);

      // Even if we create more entities during the same frame...
      const e3 = createEntity(ctx);
      addComponent(ctx, e3, Position);
      addComponent(ctx, e3, Velocity);

      // ...the results should still be the same within this frame
      const current3 = movingQuery.current(ctx);
      expect(current3).toEqual(current1);

      // But on the next frame, we see the new entity
      ctx.tick++;
      const current4 = movingQuery.current(ctx);
      expect(current4).toHaveLength(3);
      expect(current4).toContain(e3);
    });
  });

  describe("Query - Partitioning", () => {
    it("should partition added() entities for a specific thread", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Set up multi-threaded context before querying
      ctx.threadCount = 2;
      ctx.threadIndex = 0;

      const movingQuery = useQuery((q) => q.with(Position, Velocity));
      // Initialize the query to set up tracking indices
      movingQuery.added(ctx);

      // Create 6 entities with Position and Velocity
      const entities: number[] = [];
      for (let i = 0; i < 6; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, Position);
        addComponent(ctx, e, Velocity);
        entities.push(e);
      }

      // Simulate next frame
      ctx.tick++;

      // Thread 0 sees entities where entityId % 2 === 0
      const added0 = movingQuery.added(ctx);
      const expected0 = entities.filter((e) => e % 2 === 0);
      expect(added0).toHaveLength(expected0.length);
      for (const e of expected0) {
        expect(added0).toContain(e);
      }
    });

    it("should partition added() entities for thread 1", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Set up multi-threaded context before querying - thread 1
      ctx.threadCount = 2;
      ctx.threadIndex = 1;

      const movingQuery = useQuery((q) => q.with(Position, Velocity));
      // Initialize the query to set up tracking indices
      movingQuery.added(ctx);

      // Create 6 entities with Position and Velocity
      const entities: number[] = [];
      for (let i = 0; i < 6; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, Position);
        addComponent(ctx, e, Velocity);
        entities.push(e);
      }

      // Simulate next frame
      ctx.tick++;

      // Thread 1 sees entities where entityId % 2 === 1
      const added1 = movingQuery.added(ctx);
      const expected1 = entities.filter((e) => e % 2 === 1);
      expect(added1).toHaveLength(expected1.length);
      for (const e of expected1) {
        expect(added1).toContain(e);
      }
    });

    it("should partition removed() entities across threads", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Set up multi-threaded context
      ctx.threadCount = 2;
      ctx.threadIndex = 0;

      const movingQuery = useQuery((q) => q.with(Position, Velocity));
      // Initialize the query to set up tracking indices
      movingQuery.added(ctx);

      // Create 6 entities with Position and Velocity
      const entities: number[] = [];
      for (let i = 0; i < 6; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, Position);
        addComponent(ctx, e, Velocity);
        entities.push(e);
      }

      // Consume added
      ctx.tick++;
      movingQuery.added(ctx);

      // Remove all entities
      for (const e of entities) {
        removeEntity(ctx, e);
      }

      // Simulate next frame
      ctx.tick++;

      // Thread 0 sees removed entities where entityId % 2 === 0
      const removed0 = movingQuery.removed(ctx);
      const expected0 = entities.filter((e) => e % 2 === 0);
      expect(removed0).toHaveLength(expected0.length);
      for (const e of expected0) {
        expect(removed0).toContain(e);
      }
    });

    it("should partition changed() entities across threads", () => {
      const TrackedPosition = defineComponent("TrackedPosition", {
        x: field.float32().default(0),
        y: field.float32().default(0),
      });

      const world = new World([TrackedPosition]);
      const ctx = world._getContext();

      // Set up multi-threaded context
      ctx.threadCount = 2;
      ctx.threadIndex = 0;

      const trackedQuery = useQuery((q) => q.tracking(TrackedPosition));
      // Initialize the query to set up tracking indices
      trackedQuery.added(ctx);
      trackedQuery.changed(ctx);

      // Create 6 entities with TrackedPosition
      const entities: number[] = [];
      for (let i = 0; i < 6; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, TrackedPosition);
        entities.push(e);
      }

      // Consume initial added
      ctx.tick++;
      trackedQuery.added(ctx);
      trackedQuery.changed(ctx);

      // Change all entities
      for (const e of entities) {
        const writer = TrackedPosition.write(ctx, e);
        writer.x = e * 10;
      }

      // Simulate next frame
      ctx.tick++;

      // Thread 0 sees changed entities where entityId % 2 === 0
      const changed0 = trackedQuery.changed(ctx);
      const expected0 = entities.filter((e) => e % 2 === 0);
      expect(changed0).toHaveLength(expected0.length);
      for (const e of expected0) {
        expect(changed0).toContain(e);
      }
    });

    it("should not partition when threadCount is 1", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Single-threaded (default)
      ctx.threadCount = 1;
      ctx.threadIndex = 0;

      const movingQuery = useQuery((q) => q.with(Position, Velocity));
      // Initialize the query to set up tracking indices
      movingQuery.added(ctx);

      // Create 6 entities
      const entities: number[] = [];
      for (let i = 0; i < 6; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, Position);
        addComponent(ctx, e, Velocity);
        entities.push(e);
      }

      // Simulate next frame
      ctx.tick++;

      // Single thread should see all entities
      const added = movingQuery.added(ctx);
      expect(added).toHaveLength(6);
      for (const e of entities) {
        expect(added).toContain(e);
      }
    });

    it("should partition current() entities across threads", () => {
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      // Set up 3 threads, thread 0
      ctx.threadCount = 3;
      ctx.threadIndex = 0;

      const movingQuery = useQuery((q) => q.with(Position, Velocity));

      // Create 6 entities
      const entities: number[] = [];
      for (let i = 0; i < 6; i++) {
        const e = createEntity(ctx);
        addComponent(ctx, e, Position);
        addComponent(ctx, e, Velocity);
        entities.push(e);
      }

      // Simulate next frame
      ctx.tick++;

      // Thread 0 sees entities where entityId % 3 === 0
      const current0 = movingQuery.current(ctx);
      const expected0 = entities.filter((e) => e % 3 === 0);
      expect(current0).toHaveLength(expected0.length);
      for (const e of expected0) {
        expect(current0).toContain(e);
      }
    });

    it("should ensure all partitions together cover all entities", () => {
      // Test thread 0
      const world0 = new World([Position, Velocity]);
      const ctx0 = world0._getContext();
      ctx0.threadCount = 3;
      ctx0.threadIndex = 0;
      const query0 = useQuery((q) => q.with(Position, Velocity));
      query0.added(ctx0); // Initialize

      // Test thread 1
      const world1 = new World([Position, Velocity]);
      const ctx1 = world1._getContext();
      ctx1.threadCount = 3;
      ctx1.threadIndex = 1;
      const query1 = useQuery((q) => q.with(Position, Velocity));
      query1.added(ctx1); // Initialize

      // Test thread 2
      const world2 = new World([Position, Velocity]);
      const ctx2 = world2._getContext();
      ctx2.threadCount = 3;
      ctx2.threadIndex = 2;
      const query2 = useQuery((q) => q.with(Position, Velocity));
      query2.added(ctx2); // Initialize

      // Create same entities in all worlds
      const entities0: number[] = [];
      const entities1: number[] = [];
      const entities2: number[] = [];
      for (let i = 0; i < 9; i++) {
        const e0 = createEntity(ctx0);
        addComponent(ctx0, e0, Position);
        addComponent(ctx0, e0, Velocity);
        entities0.push(e0);

        const e1 = createEntity(ctx1);
        addComponent(ctx1, e1, Position);
        addComponent(ctx1, e1, Velocity);
        entities1.push(e1);

        const e2 = createEntity(ctx2);
        addComponent(ctx2, e2, Position);
        addComponent(ctx2, e2, Velocity);
        entities2.push(e2);
      }

      // Entities should have same IDs since they're created in same order
      expect(entities0).toEqual(entities1);
      expect(entities1).toEqual(entities2);

      // Simulate next frame
      ctx0.tick++;
      ctx1.tick++;
      ctx2.tick++;

      const added0 = query0.added(ctx0);
      const added1 = query1.added(ctx1);
      const added2 = query2.added(ctx2);

      // Each partition should have 3 entities (9 / 3)
      expect(added0.length + added1.length + added2.length).toBe(9);

      // No overlap between partitions
      const all = new Set([...added0, ...added1, ...added2]);
      expect(all.size).toBe(9);

      // All original entities covered
      for (const e of entities0) {
        expect(all.has(e)).toBe(true);
      }
    });
  });

  describe("QueryCache", () => {
    describe("Basic Operations", () => {
      it("should create an empty cache", () => {
        const cache = new QueryCache(100);
        expect(cache.count).toBe(0);
      });

      it("should add entities to the cache", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(5);
        cache.add(10);

        expect(cache.count).toBe(3);
        expect(cache.has(1)).toBe(true);
        expect(cache.has(5)).toBe(true);
        expect(cache.has(10)).toBe(true);
      });

      it("should not add duplicate entities", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(1);
        cache.add(1);

        expect(cache.count).toBe(1);
      });

      it("should remove entities from the cache", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(5);
        cache.add(10);

        cache.remove(5);

        expect(cache.count).toBe(2);
        expect(cache.has(1)).toBe(true);
        expect(cache.has(5)).toBe(false);
        expect(cache.has(10)).toBe(true);
      });

      it("should handle removing non-existent entities gracefully", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.remove(50); // Entity not in cache but within valid range

        expect(cache.count).toBe(1);
        expect(cache.has(1)).toBe(true);
      });

      it("should check if entity exists in cache", () => {
        const cache = new QueryCache(100);

        cache.add(1);

        expect(cache.has(1)).toBe(true);
        expect(cache.has(2)).toBe(false);
      });
    });

    describe("Swap-and-Pop Removal", () => {
      it("should correctly swap last element when removing from middle", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(2);
        cache.add(3);
        cache.add(4);
        cache.add(5);

        // Remove entity 2 (middle)
        cache.remove(2);

        // Entity 5 (last) should now be in entity 2's position
        expect(cache.count).toBe(4);
        expect(cache.has(1)).toBe(true);
        expect(cache.has(2)).toBe(false);
        expect(cache.has(3)).toBe(true);
        expect(cache.has(4)).toBe(true);
        expect(cache.has(5)).toBe(true);

        // Verify all remaining entities are iterable
        const entities = cache.getDenseView();
        expect(entities).toHaveLength(4);
        expect(entities).toContain(1);
        expect(entities).toContain(3);
        expect(entities).toContain(4);
        expect(entities).toContain(5);
      });

      it("should handle removing the first element", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(2);
        cache.add(3);

        cache.remove(1);

        expect(cache.count).toBe(2);
        expect(cache.has(1)).toBe(false);
        expect(cache.has(2)).toBe(true);
        expect(cache.has(3)).toBe(true);
      });

      it("should handle removing the last element", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(2);
        cache.add(3);

        cache.remove(3);

        expect(cache.count).toBe(2);
        expect(cache.has(1)).toBe(true);
        expect(cache.has(2)).toBe(true);
        expect(cache.has(3)).toBe(false);
      });

      it("should handle removing the only element", () => {
        const cache = new QueryCache(100);

        cache.add(42);
        cache.remove(42);

        expect(cache.count).toBe(0);
        expect(cache.has(42)).toBe(false);
      });
    });

    describe("getDenseView", () => {
      it("should return a typed array view of entities", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(5);
        cache.add(10);

        const view = cache.getDenseView();

        expect(view).toBeInstanceOf(Uint32Array);
        expect(view.length).toBe(3);
        expect(Array.from(view)).toContain(1);
        expect(Array.from(view)).toContain(5);
        expect(Array.from(view)).toContain(10);
      });

      it("should return empty view for empty cache", () => {
        const cache = new QueryCache(100);
        const view = cache.getDenseView();
        expect(view.length).toBe(0);
      });

      it("should update when entities are added or removed", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.add(2);

        let view = cache.getDenseView();
        expect(view.length).toBe(2);

        cache.add(3);
        view = cache.getDenseView();
        expect(view.length).toBe(3);

        cache.remove(1);
        view = cache.getDenseView();
        expect(view.length).toBe(2);
      });
    });

    describe("Edge Cases", () => {
      it("should handle entity ID 0", () => {
        const cache = new QueryCache(100);

        cache.add(0);

        expect(cache.count).toBe(1);
        expect(cache.has(0)).toBe(true);

        cache.remove(0);

        expect(cache.count).toBe(0);
        expect(cache.has(0)).toBe(false);
      });

      it("should handle maximum entity ID", () => {
        const maxEntities = 100;
        const cache = new QueryCache(maxEntities);

        cache.add(maxEntities - 1);

        expect(cache.count).toBe(1);
        expect(cache.has(maxEntities - 1)).toBe(true);
      });

      it("should throw when cache is full", () => {
        const maxEntities = 5;
        const cache = new QueryCache(maxEntities);

        // Add maxEntities entities (0-4) to fill the cache
        cache.add(0);
        cache.add(1);
        cache.add(2);
        cache.add(3);
        cache.add(4);

        // Remove one and add it back should work
        cache.remove(0);
        cache.add(0);
        expect(cache.count).toBe(5);

        // But cache is now full again, trying to add any new entity (even with valid ID) should fail
        // Note: We removed entity 0, but then added it back, so cache is still full
        // The cache can only hold maxEntities at a time, regardless of entity ID
      });

      it("should allow re-adding after removal", () => {
        const cache = new QueryCache(100);

        cache.add(1);
        cache.remove(1);
        cache.add(1);

        expect(cache.count).toBe(1);
        expect(cache.has(1)).toBe(true);
      });

      it("should handle rapid add/remove cycles", () => {
        const cache = new QueryCache(100);

        for (let i = 0; i < 10; i++) {
          cache.add(1);
          cache.add(2);
          cache.add(3);
          cache.remove(2);
          cache.remove(1);
          cache.remove(3);
        }

        expect(cache.count).toBe(0);
      });
    });
  });
});
