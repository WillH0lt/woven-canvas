import {
  World,
  field,
  defineSystem,
  defineComponent,
  defineQuery,
  type Context,
} from "../../src";

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
    this.Position = defineComponent({
      x: field.float32(),
      y: field.float32(),
    });

    this.Velocity = defineComponent({
      x: field.float32(),
      y: field.float32(),
    });

    this.world = new World(
      {
        Position: this.Position,
        Velocity: this.Velocity,
      },
      { maxEntities: 20_000 }
    );

    const Position = this.Position;
    const Velocity = this.Velocity;

    const query = defineQuery((q) => q.with(Position, Velocity));

    this.moveSystem = defineSystem((ctx: Context) => {
      const posX = Position.buffer.x;
      const posY = Position.buffer.y;
      const velX = Velocity.buffer.x;
      const velY = Velocity.buffer.y;

      const particles = query.current(ctx);
      for (let i = 0; i < particles.length; i++) {
        const eid = particles[i];
        posX[eid] += velX[eid];
        posY[eid] += velY[eid];

        updateCount++;
      }
    });
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
    this.world.removeEntity(entity);
  },
  cleanup() {
    updateCount = 0;
  },
  updateMovementSystem() {
    this.world.execute(this.moveSystem);
  },
  getMovementSystemUpdateCount() {
    return updateCount;
  },
};

export default library;
