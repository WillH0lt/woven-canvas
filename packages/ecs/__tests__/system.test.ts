import { describe, it, expect, beforeEach } from "vitest";
import { World, System, field } from "../src/index.js";

describe("System", () => {
  let world: World;
  let Position: any;

  beforeEach(() => {
    world = new World();

    Position = world.createComponent({
      x: field.float32().default(0),
      y: field.float32().default(0),
    });
  });

  describe("System Creation", () => {
    it("should create a system via world.createSystem", () => {
      class TestSystem extends System {
        execute(): void {}
      }

      const system = world.createSystem(TestSystem);

      expect(system).toBeInstanceOf(TestSystem);
      expect(system).toBeInstanceOf(System);
    });

    it("should allow system to access world methods via protected helpers", () => {
      class TestSystem extends System {
        public createdEntity = false;

        execute(): void {
          const entity = this.createEntity();
          this.addComponent(entity, Position, { x: 10, y: 20 });
          this.createdEntity = true;
        }
      }

      const system = world.createSystem(TestSystem);
      world.execute(system);

      expect(system.createdEntity).toBe(true);
    });
  });

  describe("System Execution Hooks", () => {
    it("should call beforeExecute hook which clears query added lists", () => {
      class TestSystem extends System {
        private entities = this.query((q) => q.with(Position));
        public addedCount = 0;

        execute(): void {
          // Count added entities
          for (const _ of this.entities.added) {
            this.addedCount++;
          }
        }
      }

      const system = world.createSystem(TestSystem);

      // First execution - create entity
      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });

      world.execute(system);
      expect(system.addedCount).toBe(1);

      // Second execution - added list should be cleared by afterExecute hook
      system.addedCount = 0;
      world.execute(system);
      expect(system.addedCount).toBe(0);

      // Third execution - add new entity
      const e2 = world.createEntity();
      world.addComponent(e2, Position, { x: 10, y: 10 });

      world.execute(system);
      expect(system.addedCount).toBe(1);
    });

    it("should call tick which calls execute", () => {
      class TestSystem extends System {
        public executed = false;

        execute(): void {
          this.executed = true;
        }
      }

      const system = world.createSystem(TestSystem);
      expect(system.executed).toBe(false);

      world.execute(system);
      expect(system.executed).toBe(true);
    });
  });

  describe("System Queries", () => {
    it("should allow systems to create and use queries", () => {
      class MovementSystem extends System {
        private movingEntities = this.query((q) => q.with(Position));

        public getCount(): number {
          return this.movingEntities.current.length;
        }

        execute(): void {
          for (const entityId of this.movingEntities.current) {
            const pos = Position.write(entityId);
            pos.x += 1;
          }
        }
      }

      const system = world.createSystem(MovementSystem);

      world.execute(system);

      expect(system.getCount()).toBe(0);

      const e1 = world.createEntity();
      world.addComponent(e1, Position, { x: 0, y: 0 });

      world.execute(system);

      expect(system.getCount()).toBe(1);

      const pos = Position.read(e1);
      expect(pos.x).toBe(1);
    });
  });

  describe("System State", () => {
    it("should maintain system state between executions", () => {
      class CounterSystem extends System {
        public count = 0;

        execute(): void {
          this.count++;
        }
      }

      const system = world.createSystem(CounterSystem);

      expect(system.count).toBe(0);

      world.execute(system);
      expect(system.count).toBe(1);

      world.execute(system);
      expect(system.count).toBe(2);

      world.execute(system);
      expect(system.count).toBe(3);
    });
  });
});
