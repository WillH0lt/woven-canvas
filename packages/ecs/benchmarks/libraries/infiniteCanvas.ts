import {
  World,
  field,
  defineSystem,
  defineComponent,
  defineQuery,
  createEntity,
  addComponent,
  removeComponent,
  removeEntity,
  type Context,
} from "../../src";

import type { BenchmarkLibrary } from "../types";

let updateCount = 0;

const library: BenchmarkLibrary = {
  name: "infinitecanvas-ecs",
  suites: ["Add/Remove", "Destroy", "Velocity"],
  world: null,
  ctx: null,
  Position: null,
  Velocity: null,
  moveSystem: null,
  setup() {
    this.Position = defineComponent("Position", {
      x: field.float32(),
      y: field.float32(),
    });

    this.Velocity = defineComponent("Velocity", {
      x: field.float32(),
      y: field.float32(),
    });

    this.world = new World([this.Position, this.Velocity], {
      maxEntities: 20_000,
    });

    this.ctx = this.world.getContext();

    const Position = this.Position;
    const Velocity = this.Velocity;

    const query = defineQuery((q) => q.with(Position, Velocity));

    this.moveSystem = defineSystem((ctx: Context) => {
      const posX = Position.buffer.x;
      const posY = Position.buffer.y;
      const velX = Velocity.buffer.x;
      const velY = Velocity.buffer.y;

      const particles = query.current(ctx);
      // console.log(`Updating ${particles.length} moving entities`);
      for (let i = 0; i < particles.length; i++) {
        const eid = particles[i]!;
        posX[eid] += velX[eid];
        posY[eid] += velY[eid];

        updateCount++;
      }
    });
  },
  createEntity() {
    return createEntity(this.ctx);
  },
  addPositionComponent(entity: any) {
    addComponent(this.ctx, entity, this.Position, { x: 0, y: 0 });
  },
  addVelocityComponent(entity: any) {
    addComponent(this.ctx, entity, this.Velocity, { x: 1.1, y: 1.1 });
  },
  removePositionComponent(entity: any) {
    removeComponent(this.ctx, entity, this.Position);
  },
  removeVelocityComponent(entity: any) {
    removeComponent(this.ctx, entity, this.Velocity);
  },
  destroyEntity(entity: any) {
    removeEntity(this.ctx, entity);
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
