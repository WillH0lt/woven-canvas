import { World, field, System } from "../../src";

import type { BenchmarkLibrary } from "../types";

let updateCount = 0;

const library: BenchmarkLibrary = {
  name: "infinitecanvas-ecs",
  suites: ["Add/Remove", "Destroy", "Velocity"],
  world: null,
  Position: null,
  Velocity: null,
  moveSystem: null,
  setup() {
    this.world = new World();

    // Define components
    this.Position = this.world.createComponent({
      x: field.float32().default(0),
      y: field.float32().default(0),
    });

    this.Velocity = this.world.createComponent({
      x: field.float32().default(0),
      y: field.float32().default(0),
      speed: field.uint16().default(0),
    });

    const Position = this.Position;
    const Velocity = this.Velocity;

    // Create movement system
    class MoveSystem extends System {
      private particles = this.query((q) => q.with(Position, Velocity));

      execute() {
        for (const entity of this.particles.current) {
          const pos = entity.get(Position)!.value;
          const vel = entity.get(Velocity)!.value;
          pos.x += vel.x;
          pos.y += vel.y;
          updateCount++;
        }
      }
    }

    this.moveSystem = this.world.createSystem(MoveSystem);
  },
  createEntity() {
    return this.world.createEntity();
  },
  addPositionComponent(entity: any) {
    entity.add(this.Position, { x: 100, y: 100 });
  },
  addVelocityComponent(entity: any) {
    entity.add(this.Velocity, { x: 1.2, y: 1.7 });
  },
  removePositionComponent(entity: any) {
    entity.remove(this.Position);
  },
  removeVelocityComponent(entity: any) {
    entity.remove(this.Velocity);
  },
  destroyEntity(entity: any) {
    this.world?.removeEntity(entity);
  },
  cleanup() {
    updateCount = 0;
  },
  updateMovementSystem() {
    this.moveSystem.execute();
  },
  getMovementSystemUpdateCount() {
    return updateCount;
  },
};

export default library;
