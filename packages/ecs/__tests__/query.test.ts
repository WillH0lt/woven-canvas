import { describe, it, expect, beforeEach } from "vitest";

import { field, defineComponent, World, query } from "../src";
import type { Context } from "../src";

describe("Query", () => {
  let Position: any;
  let Velocity: any;
  let Health: any;
  let Enemy: any;
  let Player: any;

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

    Enemy = defineComponent({
      damage: field.uint8().default(10),
    });

    Player = defineComponent({
      score: field.uint32().default(0),
    });
  });

  describe("Query - Basic Operations", () => {
    it("should query entities with specific components", () => {
      const world = new World({ Position, Velocity });

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
      const results = Array.from(query(ctx, (q) => q.with(Position)));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
    });

    it("should query entities with multiple required components", () => {
      const world = new World({ Position, Velocity, Health });

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
      const results = Array.from(query(ctx, (q) => q.with(Position, Velocity)));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e3);
      expect(results).not.toContain(e2);
    });

    it("should query entities without specific components", () => {
      const world = new World({ Position, Enemy, Player });

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
      const results = Array.from(
        query(ctx, (q) => q.with(Position).without(Enemy))
      );

      expect(results).toHaveLength(2);
      expect(results).toContain(e2);
      expect(results).toContain(e3);
      expect(results).not.toContain(e1);
    });

    it("should query entities with any of specified components", () => {
      const world = new World({ Enemy, Player, Health });

      const e1 = world.createEntity();
      world.addComponent(e1, Enemy);

      const e2 = world.createEntity();
      world.addComponent(e2, Player);

      const e3 = world.createEntity();
      world.addComponent(e3, Health);

      const ctx = world.getContext();

      // Query for entities that are either Enemy OR Player
      const results = Array.from(query(ctx, (q) => q.any(Enemy, Player)));

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
    });

    it("should combine with, without, and any clauses", () => {
      const world = new World({ Position, Velocity, Enemy, Player, Health });

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
      const results = Array.from(
        query(ctx, (q) => q.with(Position).any(Player, Enemy).without(Velocity))
      );

      expect(results).toHaveLength(2);
      expect(results).toContain(e2);
      expect(results).toContain(e3);
      expect(results).not.toContain(e1);
      expect(results).not.toContain(e4);
    });

    it("should handle empty queries", () => {
      const world = new World({ Position });

      // Create at least one entity so entityBuffer exists
      const e1 = world.createEntity();
      // Don't add Position component

      const ctx = world.getContext();

      const results = Array.from(query(ctx, (q) => q.with(Position)));

      expect(results).toHaveLength(0);
    });

    it("should iterate over query results", () => {
      const world = new World({ Position, Velocity });

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 1 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 10, y: 10 });
      world.addComponent(e2, Velocity, { dx: 2, dy: 2 });

      const ctx = world.getContext();

      // Use query in a for...of loop
      let count = 0;
      for (const entityId of query(ctx, (q) => q.with(Position, Velocity))) {
        count++;
        const pos = Position.write(entityId);
        const vel = Velocity.read(entityId);

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
      const world = new World({ Position, Velocity, Health, Enemy });

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
      const results = Array.from(
        query(ctx, (q) => q.with(Position, Velocity).without(Enemy))
      );
      const endTime = performance.now();

      // Entities with Position+Velocity but not Enemy
      // All entities have Position, i%2===0 have Velocity (500), i%5===0 have Enemy
      // Even numbers without multiples of 10: 500 - 100 = 400
      expect(results.length).toBe(400);

      // Should be very fast (under 10ms for 1000 entities)
      expect(endTime - startTime).toBeLessThan(10);
    });

    it("should handle queries on large entity sets efficiently", () => {
      const world = new World({ Position, Velocity });

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
      for (const _ of query(ctx, (q) => q.with(Position, Velocity))) {
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
      const world = new World({ Position, Velocity });

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });
      world.addComponent(e2, Velocity, { dx: 3, dy: 4 });

      const ctx = world.getContext();

      const positions: Array<{ x: number; y: number }> = [];
      for (const entityId of query(ctx, (q) => q.with(Position, Velocity))) {
        const pos = Position.read(entityId);
        positions.push({ x: pos.x, y: pos.y });
      }

      expect(positions).toHaveLength(2);
      expect(positions[0]).toEqual({ x: 10, y: 20 });
      expect(positions[1]).toEqual({ x: 30, y: 40 });
    });

    it("should allow writing component data during iteration", () => {
      const world = new World({ Position, Velocity });

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });
      world.addComponent(e1, Velocity, { dx: 5, dy: 10 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 100, y: 200 });
      world.addComponent(e2, Velocity, { dx: -2, dy: -3 });

      const ctx = world.getContext();

      // Apply velocity to position
      for (const entityId of query(ctx, (q) => q.with(Position, Velocity))) {
        const pos = Position.write(entityId);
        const vel = Velocity.read(entityId);
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
      const world = new World({ Position, Velocity, Enemy });

      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      const ctx = world.getContext();

      const results = Array.from(query(ctx, (q) => q.with(Enemy)));

      expect(results).toHaveLength(0);
    });

    it("should handle queries with all entities matching", () => {
      const world = new World({ Position });

      const entities = [];
      for (let i = 0; i < 10; i++) {
        const e = world.createEntity();
        world.addComponent(e, Position, { x: i, y: i });
        entities.push(e);
      }

      const ctx = world.getContext();

      const results = Array.from(query(ctx, (q) => q.with(Position)));

      expect(results).toHaveLength(10);
      for (const entity of entities) {
        expect(results).toContain(entity);
      }
    });

    it("should handle complex multi-clause queries", () => {
      const world = new World({ Position, Velocity, Health, Enemy, Player });

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
      const results = Array.from(
        query(ctx, (q) =>
          q.with(Position, Health).any(Player, Enemy).without(Velocity)
        )
      );

      expect(results).toHaveLength(2);
      expect(results).toContain(e1);
      expect(results).toContain(e2);
      expect(results).not.toContain(e3);
      expect(results).not.toContain(e4);
    });

    it("should handle entity with all components", () => {
      const world = new World({ Position, Velocity, Health, Enemy, Player });

      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);
      world.addComponent(e1, Health);
      world.addComponent(e1, Enemy);
      world.addComponent(e1, Player);

      const ctx = world.getContext();

      const results1 = Array.from(query(ctx, (q) => q.with(Position)));
      expect(results1).toContain(e1);

      const results2 = Array.from(
        query(ctx, (q) => q.with(Position, Velocity, Health, Enemy, Player))
      );
      expect(results2).toContain(e1);

      const results3 = Array.from(
        query(ctx, (q) => q.with(Position).without(Velocity))
      );
      expect(results3).not.toContain(e1);
    });
  });
});
