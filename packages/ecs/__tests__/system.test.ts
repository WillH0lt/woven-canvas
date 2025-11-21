import { describe, it, expect, beforeEach } from "vitest";
import { World, System, component, field } from "../src/index.js";

describe("System", () => {
  let world: World;

  const Position = component({
    x: field.float32().default(0),
    y: field.float32().default(0),
  });

  beforeEach(() => {
    world = new World();
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
          entity.add(Position, { x: 10, y: 20 });
          this.createdEntity = true;
        }
      }

      const system = world.createSystem(TestSystem);
      system.execute();

      expect(system.createdEntity).toBe(true);
    });
  });

  describe("System Execution Hooks", () => {
    it("should call afterExecute hook which clears query added lists", () => {
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
      e1.add(Position, { x: 0, y: 0 });

      system.execute();
      expect(system.addedCount).toBe(1);

      // Second execution - added list should be cleared by afterExecute hook
      system.addedCount = 0;
      system.execute();
      expect(system.addedCount).toBe(0);

      // Third execution - add new entity
      const e2 = world.createEntity();
      e2.add(Position, { x: 10, y: 10 });

      system.execute();
      expect(system.addedCount).toBe(1);
    });

    it("should proxy execute method to wrap with hooks", () => {
      let executionOrder: string[] = [];

      class TestSystem extends System {
        // Override internal hooks to track execution
        _beforeExecute(): void {
          executionOrder.push("before");
        }

        execute(): void {
          executionOrder.push("execute");
        }

        _afterExecute(): void {
          executionOrder.push("after");
        }
      }

      const system = world.createSystem(TestSystem);
      system.execute();

      expect(executionOrder).toEqual(["before", "execute", "after"]);
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

      system.execute();
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
          for (const entity of this.movingEntities.current) {
            const pos = entity.get(Position)!;
            pos.value.x += 1;
          }
        }
      }

      const system = world.createSystem(MovementSystem);

      system.execute();

      expect(system.getCount()).toBe(0);

      const e1 = world.createEntity();
      e1.add(Position, { x: 0, y: 0 });

      system.execute();

      expect(system.getCount()).toBe(1);

      const pos = e1.get(Position)!;
      expect(pos.value.x).toBe(1);
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

      system.execute();
      expect(system.count).toBe(1);

      system.execute();
      expect(system.count).toBe(2);

      system.execute();
      expect(system.count).toBe(3);
    });
  });
});
