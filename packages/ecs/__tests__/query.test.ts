import { describe, it, expect, beforeEach } from "vitest";
import { field, System, World } from "../src/index.js";

describe("Query", () => {
  let world: World;
  let Position: any;
  let Velocity: any;
  let Health: any;
  let Enemy: any;
  let Player: any;

  beforeEach(() => {
    world = new World();

    // Define test components
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

    Enemy = world.createComponent({
      damage: field.uint8().default(10),
    });

    Player = world.createComponent({
      score: field.uint32().default(0),
    });
  });

  describe("QueryBuilder - Basic Operations", () => {
    it("should query entities with specific components", () => {
      // Create entities with different component combinations
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });

      const e3 = world.createEntity();
      world.addComponent(e3, Velocity, { dx: 5, dy: 5 });

      // Query for entities with Position
      const positionQuery = world.query((q) => q.with(Position));

      positionQuery._prepare(); // Ensure pending changes are processed

      expect(positionQuery.current).toHaveLength(2);
      expect(positionQuery.current).toContain(e1);
      expect(positionQuery.current).toContain(e2);
      expect(positionQuery.current).not.toContain(e3);
    });

    it("should query entities with multiple required components", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });

      const e3 = world.createEntity();
      world.addComponent(e3, Position, { x: 50, y: 60 });
      world.addComponent(e3, Velocity, { dx: 3, dy: 4 });
      world.addComponent(e3, Health);

      // Query for entities with both Position AND Velocity
      const query = world.query((q) => q.with(Position, Velocity));

      expect(query.current).toHaveLength(2);
      expect(query.current).toContain(e1);
      expect(query.current).toContain(e3);
      expect(query.current).not.toContain(e2);
    });

    it("should query entities without specific components", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 10, y: 20 });
      world.addComponent(e1, Enemy);

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 30, y: 40 });
      world.addComponent(e2, Player);

      const e3 = world.createEntity();
      world.addComponent(e3, Position, { x: 50, y: 60 });

      // Query for Position entities that are NOT enemies
      const query = world.query((q) => q.with(Position).without(Enemy));

      expect(query.current).toHaveLength(2);
      expect(query.current).toContain(e2);
      expect(query.current).toContain(e3);
      expect(query.current).not.toContain(e1);
    });

    it("should query entities with any of specified components", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Enemy);

      const e2 = world.createEntity();
      world.addComponent(e2, Player);

      const e3 = world.createEntity();
      world.addComponent(e3, Health);

      // Query for entities that are either Enemy OR Player
      const query = world.query((q) => q.any(Enemy, Player));

      expect(query.current).toHaveLength(2);
      expect(query.current).toContain(e1);
      expect(query.current).toContain(e2);
      expect(query.current).not.toContain(e3);
    });

    it("should combine with, without, and any clauses", () => {
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

      // Query for: Position AND (Player OR Enemy) AND NOT Velocity
      const query = world.query((q) =>
        q.with(Position).any(Player, Enemy).without(Velocity)
      );

      expect(query.current).toHaveLength(2);
      expect(query.current).toContain(e2);
      expect(query.current).toContain(e3);
      expect(query.current).not.toContain(e1);
      expect(query.current).not.toContain(e4);
    });
  });

  describe("Query - Reactive Updates", () => {
    it("should update query results when components are added", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      const query = world.query((q) => q.with(Position, Velocity));

      expect(query.current).toHaveLength(0);

      // Add Velocity component
      world.addComponent(e1, Velocity);

      query._prepare();

      expect(query.current).toHaveLength(1);
      expect(query.current).toContain(e1);
    });

    it("should update query results when components are removed", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Position);
      world.addComponent(e1, Velocity);

      const query = world.query((q) => q.with(Position, Velocity));

      expect(query.current).toHaveLength(1);

      // Remove Velocity component
      world.removeComponent(e1, Velocity);

      query._prepare();

      expect(query.current).toHaveLength(0);
    });

    it("should update query results when entities are created", () => {
      const query = world.query((q) => q.with(Position));

      expect(query.current).toHaveLength(0);

      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      query._prepare();

      expect(query.current).toHaveLength(1);
    });

    it("should update query results when entities are removed", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      const query = world.query((q) => q.with(Position));

      expect(query.current).toHaveLength(1);

      world.removeEntity(e1);

      query._prepare();

      expect(query.current).toHaveLength(0);
    });
  });

  describe("System Integration", () => {
    it("should work with System class", () => {
      // Define some test components for a system
      const Block = world.createComponent({
        type: field.uint8().default(1),
      });

      const Edited = world.createComponent({
        timestamp: field.uint32().default(0),
      });

      // Create a system that processes edited blocks
      class BlockEditSystem extends System {
        private editedBlocks = this.query((q) => q.with(Block, Edited));
        public processedCount = 0;

        public execute(): void {
          for (const entity of this.editedBlocks.current) {
            const block = Block.read(entity);
            const edited = Edited.read(entity);

            expect(block).toBeDefined();
            expect(edited).toBeDefined();

            this.processedCount++;
          }
        }
      }

      // Create system
      const system = world.createSystem(BlockEditSystem);

      // Create test entities
      const e1 = world.createEntity();
      world.addComponent(e1, Block);
      world.addComponent(e1, Edited);

      const e2 = world.createEntity();
      world.addComponent(e2, Block);

      const e3 = world.createEntity();
      world.addComponent(e3, Block);
      world.addComponent(e3, Edited);

      // Execute system
      world.execute(system);

      expect(system.processedCount).toBe(2);
    });

    it("should support multiple queries in one system", () => {
      class MovementSystem extends System {
        private movingEntities = this.query((q) => q.with(Position, Velocity));
        private staticEntities = this.query((q) =>
          q.with(Position).without(Velocity)
        );

        public execute(): void {
          // Move entities with velocity
          for (const entity of this.movingEntities.current) {
            const pos = Position.write(entity);
            const vel = Velocity.read(entity);

            pos.x += vel.dx;
            pos.y += vel.dy;
          }
        }

        public getMovingCount(): number {
          return this.movingEntities.current.length;
        }

        public getStaticCount(): number {
          return this.staticEntities.current.length;
        }
      }

      const system = world.createSystem(MovementSystem);

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });
      world.addComponent(e1, Velocity, { dx: 1, dy: 2 });

      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 10, y: 10 });

      world.execute(system);

      expect(system.getMovingCount()).toBe(1);
      expect(system.getStaticCount()).toBe(1);

      const pos = Position.read(e1);
      expect(pos.x).toBeCloseTo(1);
      expect(pos.y).toBeCloseTo(2);
    });
  });

  describe("Performance - Bitmask Operations", () => {
    it("should efficiently handle large numbers of entities", () => {
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

      // Query should be fast with bitmask operations
      const query = world.query((q: any) =>
        q.with(Position, Velocity).without(Enemy)
      );

      const startTime = performance.now();
      const results = query.current;
      const endTime = performance.now();

      // Should find entities divisible by 2 but not by 5
      expect(results.length).toBe(400); // (1000/2) - (1000/10)

      // Should be very fast (under 10ms for 1000 entities)
      expect(endTime - startTime).toBeLessThan(10);
    });

    it("should cache query results", () => {
      const e1 = world.createEntity();
      world.addComponent(e1, Position);

      const query = world.query((q: any) => q.with(Position));

      // First access
      const results1 = query.current;

      // Second access should use cache (same reference)
      const results2 = query.current;

      expect(results1).toBe(results2);
    });
  });

  describe("Query Added Tracking", () => {
    describe("Basic Added Tracking", () => {
      it("should track newly added entities", () => {
        const query = world.query((q) => q.with(Position));

        // Initially no entities
        expect(query.added).toHaveLength(0);
        expect(query.current).toHaveLength(0);

        // Create an entity
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 10, y: 20 });
        query._prepare();

        // Should appear in added
        expect(query.added).toHaveLength(1);
        expect(query.added).toContain(e1);
        expect(query.current).toHaveLength(1);
      });

      it("should track entities when components are added", () => {
        const query = world.query((q) => q.with(Position, Velocity));

        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 10, y: 20 });

        // Doesn't match yet (needs both components)
        expect(query.added).toHaveLength(0);
        expect(query.current).toHaveLength(0);

        // Add velocity
        world.addComponent(e1, Velocity, { dx: 1, dy: 1 });

        query._prepare();

        // Now it should appear in added
        expect(query.added).toHaveLength(1);
        expect(query.added).toContain(e1);
        expect(query.current).toHaveLength(1);

        // Call _prepare again to clear added for this non-system test
        query._prepare();
        expect(query.added).toHaveLength(0);
        expect(query.current).toHaveLength(1);
      });

      it("should handle multiple entities being added", () => {
        const query = world.query((q) => q.with(Position));

        const e1 = world.createEntity();
        world.addComponent(e1, Position);

        const e2 = world.createEntity();
        world.addComponent(e2, Position);

        const e3 = world.createEntity();
        world.addComponent(e3, Position);

        query._prepare();

        expect(query.added).toHaveLength(3);
        expect(query.current).toHaveLength(3);

        // Call _prepare again to clear added for this non-system test
        query._prepare();

        // Add one more entity
        const e4 = world.createEntity();
        world.addComponent(e4, Position);

        query._prepare();

        expect(query.added).toHaveLength(1);
        expect(query.added).toContain(e4);
        expect(query.current).toHaveLength(4);
      });
    });

    describe("Current Tracking", () => {
      it("should work with .current always available", () => {
        const query = world.query((q) => q.with(Position));

        const e1 = world.createEntity();
        world.addComponent(e1, Position);

        query._prepare();

        expect(query.current).toHaveLength(1);
        expect(query.current).toContain(e1);
      });

      it("should work with both .added and .current always available", () => {
        const query = world.query((q) => q.with(Position));

        const e1 = world.createEntity();
        world.addComponent(e1, Position);

        query._prepare();

        expect(query.added).toHaveLength(1);
        expect(query.current).toHaveLength(1);

        // Call _prepare again to clear added for this non-system test
        query._prepare();

        expect(query.added).toHaveLength(0);
        expect(query.current).toHaveLength(1);
      });
    });

    describe("System Integration with Added", () => {
      it("should work in a system like the example", () => {
        class MoveSystem extends System {
          private movers = this.query((q) => q.with(Position));
          public initCount = 0;
          public moveCount = 0;

          public execute(): void {
            // Process newly added entities
            for (const entity of this.movers.added) {
              this.initCount++;
              const pos = Position.write(entity);
              pos.x += 10;
              pos.y += 10;
            }

            // Process all current entities
            for (const entity of this.movers.current) {
              this.moveCount++;
              const pos = Position.write(entity);
              pos.x += 1;
              pos.y += 1;
            }
          }
        }

        const system = world.createSystem(MoveSystem);

        // First frame - create entities
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });

        world.execute(system);

        expect(system.initCount).toBe(1);
        expect(system.moveCount).toBe(1);

        const pos1 = Position.read(e1);
        expect(pos1.x).toBe(11); // 10 (init) + 1 (move)
        expect(pos1.y).toBe(11);

        world.execute(system);

        expect(system.initCount).toBe(1); // No new inits
        expect(system.moveCount).toBe(2); // One more move

        const updatedPos1 = Position.read(e1);
        expect(updatedPos1.x).toBe(12); // 11 + 1
        expect(updatedPos1.y).toBe(12);

        // Add a new entity
        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 100, y: 100 });

        world.execute(system);

        expect(system.initCount).toBe(2); // New entity initialized
        expect(system.moveCount).toBe(4); // Both entities moved

        const pos2 = Position.read(e2);
        expect(pos2.x).toBe(111); // 100 + 10 (init) + 1 (move)
        expect(pos2.y).toBe(111);
      });

      it("should handle entity removal correctly", () => {
        const query = world.query((q) => q.with(Position));

        const e1 = world.createEntity();
        world.addComponent(e1, Position);

        const e2 = world.createEntity();
        world.addComponent(e2, Position);

        query._prepare();

        expect(query.added).toHaveLength(2);
        expect(query.current).toHaveLength(2);

        // Call _prepare again to clear added for this non-system test
        query._prepare();

        // Remove one entity
        world.removeEntity(e1);

        query._prepare();

        expect(query.added).toHaveLength(0);
        expect(query.current).toHaveLength(1);
        expect(query.current).toContain(e2);
      });
    });
  });

  describe("Query Deferred Updates", () => {
    describe("Deferred Updates During System Execution", () => {
      it("should not immediately update query.added when entity is created during system execution", () => {
        let addedCountBeforeSpawn: number = 0;
        let addedCountAfterSpawn: number = 0;

        class SpawnerSystem extends System {
          private entities = this.query((q) => q.with(Position));

          public execute(): void {
            // Check how many entities are in .added at start
            addedCountBeforeSpawn = this.entities.added.length;

            // Create a new entity during system execution
            const newEntity = this.createEntity();
            this.addComponent(newEntity, Position, { x: 100, y: 100 });

            // The new entity should NOT appear in .added yet (deferred)
            addedCountAfterSpawn = this.entities.added.length;
          }
        }

        const system = world.createSystem(SpawnerSystem);

        // First execution - no entities exist yet
        world.execute(system);

        // Started with no entities
        expect(addedCountBeforeSpawn).toBe(0);

        // After creating new entity during execution, it should NOT have appeared in .added yet
        expect(addedCountAfterSpawn).toBe(0);

        // After system completes, run it again - now the new entity should appear
        world.execute(system);

        // This time, the newly spawned entity from previous execution should be in .added
        expect(addedCountBeforeSpawn).toBe(1);

        // After spawning another during execution, still only see 1 in .added (the new spawn is deferred)
        expect(addedCountAfterSpawn).toBe(1);
      });

      it("should defer entity addition to query during system execution", () => {
        const seenEntities: number[] = [];

        class TestSystem extends System {
          private entities = this.query((q) => q.with(Position));

          public execute(): void {
            // Record how many entities we see at the start
            seenEntities.push(this.entities.current.length);

            // Create new entity
            const e = this.createEntity();
            this.addComponent(e, Position);

            // Should still show same count (deferred)
            seenEntities.push(this.entities.current.length);
          }
        }

        const system = world.createSystem(TestSystem);

        // First execution - starts with 0 entities
        world.execute(system);
        expect(seenEntities[0]).toBe(0); // Start with 0
        expect(seenEntities[1]).toBe(0); // Still 0 after adding during execution

        // Second execution - should now see 1 entity
        seenEntities.length = 0;
        world.execute(system);
        expect(seenEntities[0]).toBe(1); // Now we see the entity from previous execution
        expect(seenEntities[1]).toBe(1); // Still 1 after adding new one
      });

      it("should defer entity removal from query during system execution", () => {
        const seenEntities: number[] = [];

        class TestSystem extends System {
          private entities = this.query((q) => q.with(Position));

          public execute(): void {
            // Record how many entities we see
            seenEntities.push(this.entities.current.length);

            // Remove a component from first entity
            const entity = this.entities.current[0];
            if (entity !== undefined) {
              this.removeComponent(entity, Position);

              // Should still show same count (deferred)
              seenEntities.push(this.entities.current.length);
            }
          }
        }

        // Create two entities
        const e1 = world.createEntity();
        world.addComponent(e1, Position);
        const e2 = world.createEntity();
        world.addComponent(e2, Position);

        const system = world.createSystem(TestSystem);

        // First execution - starts with 2 entities
        world.execute(system);
        expect(seenEntities[0]).toBe(2); // Start with 2
        expect(seenEntities[1]).toBe(2); // Still 2 after removing during execution

        // Second execution - should now see 1 entity
        seenEntities.length = 0;
        world.execute(system);
        expect(seenEntities[0]).toBe(1); // Now we see only 1 entity
      });

      it("should handle complex scenario with multiple entities being added and removed", () => {
        class ComplexSystem extends System {
          private movers = this.query((q) => q.with(Position, Velocity));
          public countsPerExecution: number[] = [];

          public execute(): void {
            this.countsPerExecution.push(this.movers.current.length);

            // Create new entities
            for (let i = 0; i < 3; i++) {
              const e = this.createEntity();
              this.addComponent(e, Position);
              this.addComponent(e, Velocity);
            }

            // Remove some existing entities
            if (this.movers.current.length > 0) {
              this.removeEntity(this.movers.current[0]);
            }
          }
        }

        const system = world.createSystem(ComplexSystem);

        // Start with 2 entities
        const e1 = world.createEntity();
        world.addComponent(e1, Position);
        world.addComponent(e1, Velocity);
        const e2 = world.createEntity();
        world.addComponent(e2, Position);
        world.addComponent(e2, Velocity);

        // First execution: 2 entities, adds 3, removes 1 = 4 total after
        world.execute(system);
        expect(system.countsPerExecution[0]).toBe(2);

        // Second execution: should see 4 entities now
        world.execute(system);
        expect(system.countsPerExecution[1]).toBe(4);

        // Third execution: previous execution added 3, removed 1 = 6 total
        world.execute(system);
        expect(system.countsPerExecution[2]).toBe(6);
      });
    });
  });

  describe("Query Removed Tracking", () => {
    describe("Basic Removed Tracking", () => {
      it("should track entities when they are removed from the world", () => {
        const query = world.query((q) => q.with(Position));

        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 10, y: 20 });

        query._prepare();

        expect(query.current).toHaveLength(1);
        expect(query.removed).toHaveLength(0);

        // Remove the entity
        world.removeEntity(e1);

        query._prepare();

        // Should appear in removed
        expect(query.removed).toHaveLength(1);
        expect(query.removed).toContain(e1);
        expect(query.current).toHaveLength(0);

        // Call _prepare again to clear removed
        query._prepare();
        expect(query.removed).toHaveLength(0);
      });

      it("should track entities when components are removed", () => {
        const query = world.query((q) => q.with(Position, Velocity));

        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 10, y: 20 });
        world.addComponent(e1, Velocity, { dx: 1, dy: 1 });

        query._prepare();

        expect(query.current).toHaveLength(1);
        expect(query.removed).toHaveLength(0);

        // Remove velocity component
        world.removeComponent(e1, Velocity);

        query._prepare();

        // Should appear in removed
        expect(query.removed).toHaveLength(1);
        expect(query.removed).toContain(e1);
        expect(query.current).toHaveLength(0);

        // Call _prepare again to clear removed
        query._prepare();
        expect(query.removed).toHaveLength(0);
      });

      it("should handle multiple entities being removed", () => {
        const query = world.query((q) => q.with(Position));

        const e1 = world.createEntity();
        world.addComponent(e1, Position);

        const e2 = world.createEntity();
        world.addComponent(e2, Position);

        const e3 = world.createEntity();
        world.addComponent(e3, Position);

        query._prepare();

        expect(query.current).toHaveLength(3);

        // Remove two entities
        world.removeEntity(e1);
        world.removeComponent(e2, Position);

        query._prepare();

        expect(query.removed).toHaveLength(2);
        expect(query.removed).toContain(e1);
        expect(query.removed).toContain(e2);
        expect(query.current).toHaveLength(1);
        expect(query.current).toContain(e3);

        // Call _prepare again to clear removed
        query._prepare();
        expect(query.removed).toHaveLength(0);
      });
    });

    describe("System Integration with Removed", () => {
      it("should work in a system for cleanup logic", () => {
        class CleanupSystem extends System {
          private tracked = this.query((q) => q.with(Position));
          public cleanupCount = 0;
          public currentCount = 0;

          public execute(): void {
            // Clean up removed entities
            for (const entity of this.tracked.removed) {
              this.cleanupCount++;
            }

            // Count current entities
            this.currentCount = this.tracked.current.length;
          }
        }

        const system = world.createSystem(CleanupSystem);

        // Create entities
        const e1 = world.createEntity();
        world.addComponent(e1, Position, { x: 0, y: 0 });
        const e2 = world.createEntity();
        world.addComponent(e2, Position, { x: 10, y: 10 });

        world.execute(system);

        expect(system.cleanupCount).toBe(0);
        expect(system.currentCount).toBe(2);

        // Remove one entity
        world.removeEntity(e1);

        world.execute(system);

        expect(system.cleanupCount).toBe(1);
        expect(system.currentCount).toBe(1);

        // Run again - cleanup count should still be 1 (removed list is cleared)
        system.cleanupCount = 0;
        world.execute(system);

        expect(system.cleanupCount).toBe(0);
        expect(system.currentCount).toBe(1);
      });

      it("should handle added and removed together", () => {
        class TrackerSystem extends System {
          private entities = this.query((q) => q.with(Position));
          public addedCount = 0;
          public removedCount = 0;
          public currentCount = 0;

          public execute(): void {
            this.addedCount = this.entities.added.length;
            this.removedCount = this.entities.removed.length;
            this.currentCount = this.entities.current.length;
          }
        }

        const system = world.createSystem(TrackerSystem);

        // First frame - create entities
        const e1 = world.createEntity();
        world.addComponent(e1, Position);
        const e2 = world.createEntity();
        world.addComponent(e2, Position);

        world.execute(system);

        expect(system.addedCount).toBe(2);
        expect(system.removedCount).toBe(0);
        expect(system.currentCount).toBe(2);

        // Second frame - add one, remove one
        const e3 = world.createEntity();
        world.addComponent(e3, Position);
        world.removeEntity(e1);

        world.execute(system);

        expect(system.addedCount).toBe(1);
        expect(system.removedCount).toBe(1);
        expect(system.currentCount).toBe(2); // e2, e3

        // Third frame - no changes
        world.execute(system);

        expect(system.addedCount).toBe(0);
        expect(system.removedCount).toBe(0);
        expect(system.currentCount).toBe(2);
      });
    });
  });

  // describe("Query Change Tracking", () => {
  //   describe("Basic Change Tracking", () => {
  //     it("should track when a single tracked component changes", () => {
  //       const query = world.query((q) => q.withTracked(Position));

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 10, y: 20 });

  //       query._prepare();

  //       expect(query.changed).toHaveLength(0);

  //       // Modify the tracked component
  //       const pos = e1.get(Position)!;
  //       pos.value.x = 30;

  //       query._prepare();

  //       expect(query.changed).toHaveLength(1);
  //       expect(query.changed).toContain(e1);

  //       // Call _prepare again to clear changed
  //       query._prepare();
  //       expect(query.changed).toHaveLength(0);
  //     });

  //     it("should track changes to multiple tracked components", () => {
  //       const query = world.query((q) => q.withTracked(Position, Velocity));

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 10, y: 20 });
  //       e1.add(Velocity, { dx: 1, dy: 2 });

  //       query._prepare();

  //       expect(query.changed).toHaveLength(0);

  //       // Modify Position
  //       const pos = e1.get(Position)!;
  //       pos.value.x = 30;

  //       query._prepare();

  //       expect(query.changed).toHaveLength(1);
  //       expect(query.changed).toContain(e1);

  //       // Clear changed
  //       query._prepare();
  //       expect(query.changed).toHaveLength(0);

  //       // Modify Velocity
  //       const vel = e1.get(Velocity)!;
  //       vel.value.dx = 5;

  //       query._prepare();

  //       expect(query.changed).toHaveLength(1);
  //       expect(query.changed).toContain(e1);
  //     });

  //     it("should not track changes to non-tracked components", () => {
  //       const query = world.query((q) =>
  //         q.withTracked(Position).with(Velocity)
  //       );

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 10, y: 20 });
  //       e1.add(Velocity, { dx: 1, dy: 2 });

  //       query._prepare();

  //       expect(query.changed).toHaveLength(0);

  //       // Modify non-tracked Velocity component
  //       const vel = e1.get(Velocity)!;
  //       vel.value.dx = 5;

  //       query._prepare();

  //       expect(query.changed).toHaveLength(0);

  //       // Modify tracked Position component
  //       const pos = e1.get(Position)!;
  //       pos.value.x = 30;

  //       query._prepare();

  //       expect(query.changed).toHaveLength(1);
  //       expect(query.changed).toContain(e1);
  //     });

  //     it("should track changes to multiple entities", () => {
  //       const query = world.query((q) => q.withTracked(Position));

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 10, y: 20 });

  //       const e2 = world.createEntity();
  //       e2.add(Position, { x: 30, y: 40 });

  //       const e3 = world.createEntity();
  //       e3.add(Position, { x: 50, y: 60 });

  //       query._prepare();

  //       // Modify multiple entities
  //       e1.get(Position)!.value.x = 100;
  //       e3.get(Position)!.value.y = 200;

  //       query._prepare();

  //       expect(query.changed).toHaveLength(2);
  //       expect(query.changed).toContain(e1);
  //       expect(query.changed).toContain(e3);
  //       expect(query.changed).not.toContain(e2);
  //     });

  //     it("should only track entities that match the query", () => {
  //       const query = world.query((q) =>
  //         q.withTracked(Position).with(Velocity)
  //       );

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 10, y: 20 });
  //       e1.add(Velocity, { dx: 1, dy: 2 });

  //       const e2 = world.createEntity();
  //       e2.add(Position, { x: 30, y: 40 });
  //       // e2 doesn't have Velocity, so doesn't match query

  //       query._prepare();

  //       // Modify both entities
  //       e1.get(Position)!.value.x = 100;
  //       e2.get(Position)!.value.x = 200;

  //       query._prepare();

  //       // Only e1 should be tracked (e2 doesn't match query)
  //       expect(query.changed).toHaveLength(1);
  //       expect(query.changed).toContain(e1);
  //       expect(query.changed).not.toContain(e2);
  //     });

  //     it("should handle multiple property changes on same entity as one change", () => {
  //       const query = world.query((q) => q.withTracked(Position));

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 10, y: 20 });

  //       query._prepare();

  //       // Modify multiple properties on the same component
  //       const pos = e1.get(Position)!;
  //       pos.value.x = 30;
  //       pos.value.y = 40;
  //       pos.value.x = 50;

  //       query._prepare();

  //       // Should only appear once in changed array
  //       expect(query.changed).toHaveLength(1);
  //       expect(query.changed).toContain(e1);
  //     });
  //   });

  //   describe("System Integration with Change Tracking", () => {
  //     it("should work in a system to process changed entities", () => {
  //       class PositionChangeSystem extends System {
  //         private tracked = this.query((q) => q.withTracked(Position));
  //         public changeCount = 0;
  //         public changedEntities: Entity[] = [];

  //         public execute(): void {
  //           for (const entity of this.tracked.changed) {
  //             this.changeCount++;
  //             this.changedEntities.push(entity);
  //           }
  //         }
  //       }

  //       const system = world.createSystem(PositionChangeSystem);

  //       // Create entities
  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 0, y: 0 });
  //       const e2 = world.createEntity();
  //       e2.add(Position, { x: 10, y: 10 });

  //       world.execute(system);

  //       expect(system.changeCount).toBe(0);

  //       // Modify one entity
  //       e1.get(Position)!.value.x = 5;

  //       world.execute(system);

  //       expect(system.changeCount).toBe(1);
  //       expect(system.changedEntities).toContain(e1);

  //       // Reset for next frame
  //       system.changeCount = 0;
  //       system.changedEntities = [];

  //       // Modify both entities
  //       e1.get(Position)!.value.y = 7;
  //       e2.get(Position)!.value.x = 15;

  //       world.execute(system);

  //       expect(system.changeCount).toBe(2);
  //       expect(system.changedEntities).toContain(e1);
  //       expect(system.changedEntities).toContain(e2);
  //     });

  //     it("should work with added, removed, and changed together", () => {
  //       class CompleteTrackerSystem extends System {
  //         private entities = this.query((q) => q.withTracked(Position));
  //         public addedCount = 0;
  //         public removedCount = 0;
  //         public changedCount = 0;
  //         public currentCount = 0;

  //         public execute(): void {
  //           this.addedCount = this.entities.added.length;
  //           this.removedCount = this.entities.removed.length;
  //           this.changedCount = this.entities.changed.length;
  //           this.currentCount = this.entities.current.length;
  //         }
  //       }

  //       const system = world.createSystem(CompleteTrackerSystem);

  //       // First frame - create entities
  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 0, y: 0 });
  //       const e2 = world.createEntity();
  //       e2.add(Position, { x: 10, y: 10 });

  //       world.execute(system);

  //       expect(system.addedCount).toBe(2);
  //       expect(system.removedCount).toBe(0);
  //       expect(system.changedCount).toBe(0);
  //       expect(system.currentCount).toBe(2);

  //       // Second frame - modify one entity
  //       e1.get(Position)!.value.x = 5;

  //       world.execute(system);

  //       expect(system.addedCount).toBe(0);
  //       expect(system.removedCount).toBe(0);
  //       expect(system.changedCount).toBe(1);
  //       expect(system.currentCount).toBe(2);

  //       // Third frame - add one, remove one, modify one
  //       const e3 = world.createEntity();
  //       e3.add(Position, { x: 20, y: 20 });
  //       world.removeEntity(e2);
  //       e1.get(Position)!.value.y = 7;

  //       world.execute(system);

  //       expect(system.addedCount).toBe(1);
  //       expect(system.removedCount).toBe(1);
  //       expect(system.changedCount).toBe(1);
  //       expect(system.currentCount).toBe(2); // e1, e3
  //     });

  //     it("should track changes during system execution for next frame", () => {
  //       const seenChanges: number[] = [];

  //       class ModifierSystem extends System {
  //         private entities = this.query((q) =>
  //           q.withTracked(Position).with(Velocity)
  //         );

  //         public execute(): void {
  //           // Record how many changes we see
  //           seenChanges.push(this.entities.changed.length);

  //           // Modify an entity
  //           if (this.entities.current.length > 0) {
  //             const entity = this.entities.current[0];
  //             const pos = entity.get(Position)!;
  //             pos.value.x += 1;
  //           }

  //           // Should not see the change yet (deferred)
  //           seenChanges.push(this.entities.changed.length);
  //         }
  //       }

  //       const e1 = world.createEntity();
  //       e1.add(Position, { x: 0, y: 0 });
  //       e1.add(Velocity, { dx: 1, dy: 1 });

  //       const system = world.createSystem(ModifierSystem);

  //       // First execution - no changes yet
  //       world.execute(system);
  //       expect(seenChanges[0]).toBe(0); // Start with 0
  //       expect(seenChanges[1]).toBe(0); // Still 0 after modifying

  //       // Second execution - should see the change from previous frame
  //       seenChanges.length = 0;
  //       world.execute(system);
  //       expect(seenChanges[0]).toBe(1); // Now we see the change
  //       expect(seenChanges[1]).toBe(1); // Still 1 after new modification
  //     });
  //   });

  // describe("Change Tracking Edge Cases", () => {
  //   it("should not track changes after entity is removed from query", () => {
  //     const query = world.query((q) =>
  //       q.withTracked(Position).with(Velocity)
  //     );

  //     const e1 = world.createEntity();
  //     e1.add(Position, { x: 10, y: 20 });
  //     e1.add(Velocity, { dx: 1, dy: 2 });

  //     query._prepare();

  //     // Remove Velocity - entity no longer matches query
  //     e1.remove(Velocity);

  //     query._prepare();

  //     // Modify Position
  //     e1.get(Position)!.value.x = 30;

  //     query._prepare();

  //     // Should not be tracked because entity doesn't match query anymore
  //     expect(query.changed).toHaveLength(0);
  //   });

  //   it("should not track changes after entity is removed from world", () => {
  //     const query = world.query((q) => q.withTracked(Position));

  //     const e1 = world.createEntity();
  //     e1.add(Position, { x: 10, y: 20 });

  //     query._prepare();

  //     // Modify Position before removal
  //     e1.get(Position)!.value.x = 30;

  //     query._prepare();

  //     // Should be tracked
  //     expect(query.changed).toHaveLength(1);
  //     expect(query.changed).toContain(e1);

  //     query._prepare();

  //     // Remove entity from world
  //     world.removeEntity(e1);

  //     query._prepare();

  //     // Entity should be in removed, not in changed
  //     expect(query.removed).toHaveLength(1);
  //     expect(query.changed).toHaveLength(0);
  //   });

  //   it("should work with query without tracking specified", () => {
  //     const query = world.query((q) => q.with(Position));

  //     const e1 = world.createEntity();
  //     e1.add(Position, { x: 10, y: 20 });

  //     query._prepare();

  //     // Modify Position
  //     e1.get(Position)!.value.x = 30;

  //     query._prepare();

  //     // Should never have changed entities (no tracking)
  //     expect(query.changed).toHaveLength(0);
  //   });

  //   it("should track changes to different properties independently", () => {
  //     const query = world.query((q) => q.withTracked(Position));

  //     const e1 = world.createEntity();
  //     e1.add(Position, { x: 10, y: 20 });

  //     query._prepare();

  //     // Modify x
  //     e1.get(Position)!.value.x = 30;

  //     query._prepare();

  //     expect(query.changed).toHaveLength(1);

  //     // Clear
  //     query._prepare();

  //     // Modify y
  //     e1.get(Position)!.value.y = 40;

  //     query._prepare();

  //     expect(query.changed).toHaveLength(1);
  //   });

  //   it("should handle newly added entities with immediate changes", () => {
  //     const query = world.query((q) => q.withTracked(Position));

  //     const e1 = world.createEntity();
  //     e1.add(Position, { x: 10, y: 20 });

  //     // Modify immediately after adding
  //     e1.get(Position)!.value.x = 30;

  //     query._prepare();

  //     // Should appear in added (newly added to query)
  //     expect(query.added).toHaveLength(1);
  //     expect(query.added).toContain(e1);

  //     // Should also appear in changed (value was modified)
  //     expect(query.changed).toHaveLength(1);
  //     expect(query.changed).toContain(e1);
  //   });
  // });

  // describe("Performance with Change Tracking", () => {
  //   it("should efficiently handle many entities with tracking", () => {
  //     const query = world.query((q) => q.withTracked(Position));

  //     // Create 1000 entities
  //     const entities = [];
  //     for (let i = 0; i < 1000; i++) {
  //       const entity = world.createEntity();
  //       entity.add(Position, { x: i, y: i });
  //       entities.push(entity);
  //     }

  //     query._prepare();

  //     // Modify half of them
  //     const startTime = performance.now();
  //     for (let i = 0; i < 500; i++) {
  //       entities[i].get(Position)!.value.x += 10;
  //     }
  //     query._prepare();
  //     const endTime = performance.now();

  //     expect(query.changed).toHaveLength(500);
  //     // Should be very fast
  //     expect(endTime - startTime).toBeLessThan(50);
  // });
  //   });
  // });
});
