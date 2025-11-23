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
        this._beforeExecute();

        const posX = Position.buffer.x;
        const posY = Position.buffer.y;
        const velX = Velocity.buffer.x;
        const velY = Velocity.buffer.y;

        for (const eid of this.particles.current) {
          // const pos = Position.write(eid);
          // const vel = Velocity.read(eid);

          // pos.x += vel.x;
          // pos.y += vel.y;

          posX[eid] += velX[eid];
          posY[eid] += velY[eid];

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
    this.world.addComponent(entity, this.Position, { x: 0, y: 0 });
  },
  addVelocityComponent(entity: any) {
    this.world.addComponent(entity, this.Velocity, { x: 1.2, y: 1.7 });
  },
  removePositionComponent(entity: any) {
    this.world.removeComponent(entity, this.Position);
  },
  removeVelocityComponent(entity: any) {
    this.world.removeComponent(entity, this.Velocity);
  },
  destroyEntity(entity: any) {
    this.world?.removeEntity(entity);
  },
  cleanup() {
    updateCount = 0;
  },
  updateMovementSystem() {
    this.world!.execute(this.moveSystem);
  },
  getMovementSystemUpdateCount() {
    return updateCount;
  },
};

export default library;
