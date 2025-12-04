import { describe, it, expect, beforeEach } from "vitest";

import { field, defineComponent, World, defineQuery } from "../src";
import type { Context, Component } from "../src";

describe("Query", () => {
  let Position: Component<any>;
  let Velocity: Component<any>;
  let Health: Component<any>;
  let Enemy: Component<any>;
  let Player: Component<any>;

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

      // Create entities with different component combinations
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });

      const e3 = world.createEntity();
      world.addComponent(e3, Velocity, { dx: 5, dy: 5 });

      const ctx = world.getContext();

      // Query for entities with Position
      const positionQuery = defineQuery((q) => q.with(Position));
      const results = Array.from(positionQuery.current(ctx));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
    });

    it("should query entities with multiple required components", () => {
      const world = new World([Position, Velocity, Health]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });

      const e3 = world.createEntity();
      world.addComponent(e3, Position, { x: 50, y: 60 });
      world.addComponent(e3, Velocity, { dx: 3, dy: 4 });
      world.addComponent(e3, Health);

      const ctx = world.getContext();

      // Query for entities with both Position AND Velocity
      const movingQuery = defineQuery((q) => q.with(Position, Velocity));
      const results = Array.from(movingQuery.current(ctx));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e3);
      expect(results).not.toContain(e2);
    });

    it("should query entities without specific components", () => {
      const world = new World([Position, Enemy, Player]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Enemy);

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });
      world.addComponent(e2, Player);

      const e3 = world.createEntity();
      world.addComponent(e3, Position, { x: 50, y: 60 });

      const ctx = world.getContext();

      // Query for Position entities that are NOT enemies
      const nonEnemyQuery = defineQuery((q) => q.with(Position).without(Enemy));
      const results = Array.from(nonEnemyQuery.current(ctx));

      expect(results).toHaveLength(2);
      expect(results).toContain(e2);
      expect(results).toContain(e3);
      expect(results).not.toContain(e1);
    });

    it("should query entities with any of specified components", () => {
      const world = new World([Enemy, Player, Health]);

      const e1 = world.createEntity();
      world.addComponent(e1, Enemy);

      const e2 = world.createEntity();
      world.addComponent(e2, Player);

      const e3 = world.createEntity();
      world.addComponent(e3, Health);

      const ctx = world.getContext();

      // Query for entities that are either Enemy OR Player
      const characterQuery = defineQuery((q) => q.any(Enemy, Player));
      const results = Array.from(characterQuery.current(ctx));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
    });

    it("should combine with, without, and any clauses", () => {
      const world = new World([Position, Velocity, Enemy, Player, Health]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);
      world.addComponent(e1, Enemy);

      const e2 = world.createEntity();
      world.addComponent(e2, Position);
      world.addComponent(e2, Player);

      const e3 = world.createEntity();
      world.addComponent(e3, Position);
      world.addComponent(e3, Health);
      world.addComponent(e3, Player);

      const e4 = world.createEntity();
      world.addComponent(e4, Position);
      world.addComponent(e4, Velocity);

      const ctx = world.getContext();

      // Query for: Position AND (Player OR Enemy) AND NOT Velocity
      const complexQuery = defineQuery((q) =>
        q.with(Position).any(Player, Enemy).without(Velocity)
      );
      const results = Array.from(complexQuery.current(ctx));

      expect(results).toHaveLength(2);
      expect(results).toContain(e2);
      expect(results).toContain(e3);
      expect(results).not.toContain(e1);
      expect(results).not.toContain(e4);
    });

    it("should handle empty queries", () => {
      const world = new World([Position]);

      // Create at least one entity so entityBuffer exists
      const e1 = world.createEntity();
      // Don't add Position component

      const ctx = world.getContext();

      const positionQuery = defineQuery((q) => q.with(Position));
      const results = Array.from(positionQuery.current(ctx));

      expect(results).toHaveLength(0);
    });

    it("should iterate over query results", () => {
      const world = new World([Position, Velocity]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 1 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 10, y: 10 });
      world.addComponent(e2, Velocity, { dx: 2, dy: 2 });

      const ctx = world.getContext();

      // Use query in a for...of loop
      const movingQuery = defineQuery((q) => q.with(Position, Velocity));
      let count = 0;
      for (const entityId of movingQuery.current(ctx)) {
        count++;
        const pos = Position.write(entityId) as { x: number; y: number };
        const vel = Velocity.read(entityId) as { dx: number; dy: number };

        // Move entity
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(count).toBe(2);
      expect(Position.read(e1).x).toBeCloseTo(1);
      expect(Position.read(e2).x).toBeCloseTo(12);
    });
  });

  describe("Query - Performance", () => {
    it("should efficiently handle large numbers of entities", () => {
      const world = new World([Position, Velocity, Health, Enemy]);

      // Create 1000 entities with various component combinations
      const entities = [];
      for (let i = 0; i < 1000; i++) {
        const entity = world.createEntity();
        entities.push(entity);

        world.addComponent(entity, Position, { x: i, y: i });

        if (i % 2 === 0) {
          world.addComponent(entity, Velocity);
        }

        if (i % 3 === 0) {
          world.addComponent(entity, Health);
        }

        if (i % 5 === 0) {
          world.addComponent(entity, Enemy);
        }
      }

      const ctx = world.getContext();

      // Query should be fast with bitmask operations
      const startTime = performance.now();
      const perfQuery = defineQuery((q) =>
        q.with(Position, Velocity).without(Enemy)
      );
      const results = Array.from(perfQuery.current(ctx));
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

      // Create many entities
      for (let i = 0; i < 5000; i++) {
        const entity = world.createEntity();
        world.addComponent(entity, Position, { x: i, y: i });
        if (i % 2 === 0) {
          world.addComponent(entity, Velocity, { dx: 1, dy: 1 });
        }
      }

      const ctx = world.getContext();

      const startTime = performance.now();
      let count = 0;
      const largeQuery = defineQuery((q) => q.with(Position, Velocity));
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

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });
      world.addComponent(e2, Velocity, { dx: 3, dy: 4 });

      const ctx = world.getContext();

      const positions: Array<{ x: number; y: number }> = [];
      const readQuery = defineQuery((q) => q.with(Position, Velocity));
      for (const entityId of readQuery.current(ctx)) {
        const pos = Position.read(entityId) as { x: number; y: number };
        positions.push({ x: pos.x, y: pos.y });
      }

      expect(positions).toHaveLength(2);
      expect(positions[0]).toEqual({ x: 10, y: 20 });
      expect(positions[1]).toEqual({ x: 30, y: 40 });
    });

    it("should allow writing component data during iteration", () => {
      const world = new World([Position, Velocity]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });
      world.addComponent(e1, Velocity, { dx: 5, dy: 10 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 100, y: 200 });
      world.addComponent(e2, Velocity, { dx: -2, dy: -3 });

      const ctx = world.getContext();

      // Apply velocity to position
      const writeQuery = defineQuery((q) => q.with(Position, Velocity));
      for (const entityId of writeQuery.current(ctx)) {
        const pos = Position.write(entityId) as { x: number; y: number };
        const vel = Velocity.read(entityId) as { dx: number; dy: number };
        pos.x += vel.dx;
        pos.y += vel.dy;
      }

      expect(Position.read(e1).x).toBeCloseTo(5);
      expect(Position.read(e1).y).toBeCloseTo(10);
      expect(Position.read(e2).x).toBeCloseTo(98);
      expect(Position.read(e2).y).toBeCloseTo(197);
    });
  });

  describe("Query - Edge Cases", () => {
    it("should handle queries with no matching entities", () => {
      const world = new World([Position, Velocity, Enemy]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      const ctx = world.getContext();

      const emptyQuery = defineQuery((q) => q.with(Enemy));
      const results = Array.from(emptyQuery.current(ctx));

      expect(results).toHaveLength(0);
    });

    it("should handle queries with all entities matching", () => {
      const world = new World([Position]);

      const entities = [];
      for (let i = 0; i < 10; i++) {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: i, y: i });
        entities.push(e);
      }

      const ctx = world.getContext();

      const allMatchQuery = defineQuery((q) => q.with(Position));
      const results = Array.from(allMatchQuery.current(ctx));

      expect(results).toHaveLength(10);
      for (const entity of entities) {
        expect(results).toContain(entity);
      }
    });

    it("should handle complex multi-clause queries", () => {
      const world = new World([Position, Velocity, Health, Enemy, Player]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Health);
      world.addComponent(e1, Player);

      const e2 = world.createEntity();
      world.addComponent(e2, Position);
      world.addComponent(e2, Health);
      world.addComponent(e2, Enemy);

      const e3 = world.createEntity();
      world.addComponent(e3, Position);
      world.addComponent(e3, Velocity);
      world.addComponent(e3, Player);

      const e4 = world.createEntity();
      world.addComponent(e4, Position);
      world.addComponent(e4, Health);

      const ctx = world.getContext();

      // Query: Position AND Health AND (Player OR Enemy) AND NOT Velocity
      const complexQuery = defineQuery((q) =>
        q.with(Position, Health).any(Player, Enemy).without(Velocity)
      );
      const results = Array.from(complexQuery.current(ctx));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
      expect(results).not.toContain(e4);
    });

    it("should handle entity with all components", () => {
      const world = new World([Position, Velocity, Health, Enemy, Player]);

      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);
      world.addComponent(e1, Health);
      world.addComponent(e1, Enemy);
      world.addComponent(e1, Player);

      const ctx = world.getContext();

      const query1 = defineQuery((q) => q.with(Position));
      const results1 = Array.from(query1.current(ctx));
      expect(results1).toContain(e1);

      const query2 = defineQuery((q) =>
        q.with(Position, Velocity, Health, Enemy, Player)
      );
      const results2 = Array.from(query2.current(ctx));
      expect(results2).toContain(e1);

      const query3 = defineQuery((q) => q.with(Position).without(Velocity));
      const results3 = Array.from(query3.current(ctx));
      expect(results3).not.toContain(e1);
    });
  });

  describe("Query - Reactive added()/removed()", () => {
    it("should return entities in added() when entity is created and matches query", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const movingQuery = defineQuery((q) => q.with(Position, Velocity));

      // Initially no added entities
      let added = Array.from(movingQuery.added(ctx));
      expect(added).toHaveLength(0);

      // Create an entity that matches the query
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      // Simulate next frame - query updates are frame-based
      ctx.tick++;

      // Should appear in added()
      added = Array.from(movingQuery.added(ctx));
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);

      // Second call in same frame should return cached value
      added = Array.from(movingQuery.added(ctx));
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);
    });

    it("should return entity in added() when component is added to existing entity", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const movingQuery = defineQuery((q) => q.with(Position, Velocity));

      // Create entity with only Position
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });

      // Simulate next frame and clear the added buffer
      ctx.tick++;
      movingQuery.added(ctx);

      // Entity doesn't match query yet
      expect(Array.from(movingQuery.current(ctx))).toHaveLength(0);

      // Now add Velocity - entity should match
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      // Simulate next frame
      ctx.tick++;

      // Entity should now appear in added()
      const added = Array.from(movingQuery.added(ctx));
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);

      // And in current()
      expect(Array.from(movingQuery.current(ctx))).toContain(e1);
    });

    it("should return entity in removed() when entity is deleted", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const movingQuery = defineQuery((q) => q.with(Position, Velocity));

      // Create entity
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);

      // Simulate next frame and clear the added/removed buffers
      ctx.tick++;
      movingQuery.added(ctx);
      movingQuery.removed(ctx);

      // Delete the entity
      world.removeEntity(e1);

      // Simulate next frame
      ctx.tick++;

      // Should appear in removed()
      const removed = Array.from(movingQuery.removed(ctx));
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);
    });

    it("should return entity in removed() when component is removed from existing entity", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const movingQuery = defineQuery((q) => q.with(Position, Velocity));

      // Create entity with both components
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);

      // Simulate next frame and clear the buffers
      ctx.tick++;
      movingQuery.added(ctx);
      movingQuery.removed(ctx);

      // Entity matches query
      expect(Array.from(movingQuery.current(ctx))).toContain(e1);

      // Remove Velocity - entity should no longer match
      world.removeComponent(e1, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear in removed()
      const removed = Array.from(movingQuery.removed(ctx));
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);

      // And should no longer be in current()
      expect(Array.from(movingQuery.current(ctx))).not.toContain(e1);
    });

    it("should not return entity in removed() if component removal doesn't affect query match", () => {
      const world = new World([Position, Velocity, Health]);
      const ctx = world.getContext();

      // Query only requires Position
      const positionQuery = defineQuery((q) => q.with(Position));

      // Create entity with Position, Velocity, and Health
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);
      world.addComponent(e1, Health);

      // Simulate next frame and clear buffers
      ctx.tick++;
      positionQuery.added(ctx);
      positionQuery.removed(ctx);

      // Remove Velocity - entity should still match (query only requires Position)
      world.removeComponent(e1, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Entity should NOT appear in removed() since it still matches
      const removed = Array.from(positionQuery.removed(ctx));
      expect(removed).toHaveLength(0);

      // Should still be in current()
      expect(Array.from(positionQuery.current(ctx))).toContain(e1);
    });

    it("should handle without() clause correctly for added()", () => {
      const world = new World([Position, Velocity, Enemy]);
      const ctx = world.getContext();

      // Query for Position WITHOUT Enemy
      const nonEnemyQuery = defineQuery((q) => q.with(Position).without(Enemy));

      // Create entity with Position and Enemy - should NOT match
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Enemy);

      // Simulate next frame and clear buffers
      ctx.tick++;
      nonEnemyQuery.added(ctx);
      nonEnemyQuery.removed(ctx);

      // Entity should not be in current
      expect(Array.from(nonEnemyQuery.current(ctx))).not.toContain(e1);

      // Remove Enemy - now entity should match
      world.removeComponent(e1, Enemy);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear in added()
      const added = Array.from(nonEnemyQuery.added(ctx));
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);
    });

    it("should handle without() clause correctly for removed()", () => {
      const world = new World([Position, Velocity, Enemy]);
      const ctx = world.getContext();

      // Query for Position WITHOUT Enemy
      const nonEnemyQuery = defineQuery((q) => q.with(Position).without(Enemy));

      // Create entity with only Position - should match
      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      // Simulate next frame and clear buffers
      ctx.tick++;
      nonEnemyQuery.added(ctx);
      nonEnemyQuery.removed(ctx);

      // Entity should be in current
      expect(Array.from(nonEnemyQuery.current(ctx))).toContain(e1);

      // Add Enemy - now entity should NOT match
      world.addComponent(e1, Enemy);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear in removed()
      const removed = Array.from(nonEnemyQuery.removed(ctx));
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);

      // Should not be in current anymore
      expect(Array.from(nonEnemyQuery.current(ctx))).not.toContain(e1);
    });

    it("should handle multiple entities being added and removed", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const movingQuery = defineQuery((q) => q.with(Position, Velocity));

      // Create multiple entities
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      const e2 = world.createEntity();
      world.addComponent(e2, Position);
      const e3 = world.createEntity();
      world.addComponent(e3, Position);

      // Simulate next frame and clear buffers
      ctx.tick++;
      movingQuery.added(ctx);
      movingQuery.removed(ctx);

      // Add Velocity to e1 and e2
      world.addComponent(e1, Velocity);
      world.addComponent(e2, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Check added
      let added = Array.from(movingQuery.added(ctx));
      expect(added).toHaveLength(2);
      expect(added).toContain(e1);
      expect(added).toContain(e2);
      expect(added).not.toContain(e3);

      // Remove Velocity from e1
      world.removeComponent(e1, Velocity);

      // Simulate next frame
      ctx.tick++;

      // Check removed
      const removed = Array.from(movingQuery.removed(ctx));
      expect(removed).toHaveLength(1);
      expect(removed).toContain(e1);

      // e2 should still be in current
      expect(Array.from(movingQuery.current(ctx))).toContain(e2);
      expect(Array.from(movingQuery.current(ctx))).not.toContain(e1);
    });

    it("should only return entity once even if multiple relevant components change", () => {
      const world = new World([Position, Velocity, Health]);
      const ctx = world.getContext();

      const query = defineQuery((q) => q.with(Position, Velocity, Health));

      // Create entity with no components
      const e1 = world.createEntity();

      // Simulate next frame and clear buffers
      ctx.tick++;
      query.added(ctx);

      // Add all three components
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);
      world.addComponent(e1, Health);

      // Simulate next frame
      ctx.tick++;

      // Entity should appear only once in added()
      const added = Array.from(query.added(ctx));
      expect(added).toHaveLength(1);
      expect(added).toContain(e1);
    });

    it("should return consistent results within the same frame", () => {
      const world = new World([Position, Velocity]);
      const ctx = world.getContext();

      const movingQuery = defineQuery((q) => q.with(Position, Velocity));

      // Create entities
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);
      const e2 = world.createEntity();
      world.addComponent(e2, Position);
      world.addComponent(e2, Velocity);

      // Simulate next frame
      ctx.tick++;

      // First call to current()
      const current1 = Array.from(movingQuery.current(ctx));
      expect(current1).toHaveLength(2);

      // Second call in same frame should return identical results
      const current2 = Array.from(movingQuery.current(ctx));
      expect(current2).toEqual(current1);

      // Even if we create more entities during the same frame...
      const e3 = world.createEntity();
      world.addComponent(e3, Position);
      world.addComponent(e3, Velocity);

      // ...the results should still be the same within this frame
      const current3 = Array.from(movingQuery.current(ctx));
      expect(current3).toEqual(current1);

      // But on the next frame, we see the new entity
      ctx.tick++;
      const current4 = Array.from(movingQuery.current(ctx));
      expect(current4).toHaveLength(3);
      expect(current4).toContain(e3);
    });
  });
});
