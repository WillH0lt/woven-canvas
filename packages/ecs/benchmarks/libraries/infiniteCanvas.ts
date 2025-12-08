import {
  World,
  field,
  defineSystem,
  defineComponent,
  useQuery,
  createEntity,
  addComponent,
  removeComponent,
  removeEntity,
  type Context,
  type ComponentDef,
} from "../../src";

import type { BenchmarkLibrary } from "../types";

let updateCount = 0;

const library: BenchmarkLibrary = {
  name: "infinitecanvas-ecs",
  suites: ["Add/Remove", "Destroy", "Velocity"],
  world: null,
  ctx: null,
  Position: null as ComponentDef<any> | null,
  Velocity: null as ComponentDef<any> | null,
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
      maxEntities: 20_001, // Velocity suite creates 10000 entities without destroying
    });

    this.ctx = this.world._getContext();

    const Position = this.Position;
    const Velocity = this.Velocity;

    const query = useQuery((q) => q.with(Position, Velocity));

    this.moveSystem = defineSystem((ctx: Context) => {
      // Get component instances from context
      const positionComponent = Position._getInstance(ctx);
      const velocityComponent = Velocity._getInstance(ctx);

      const posX = positionComponent.buffer.x;
      const posY = positionComponent.buffer.y;
      const velX = velocityComponent.buffer.x;
      const velY = velocityComponent.buffer.y;

      const particles = query.current(ctx);
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
    addComponent(this.ctx, entity, this.Position, { x: 0, y: 0 } as any);
  },
  addVelocityComponent(entity: any) {
    addComponent(this.ctx, entity, this.Velocity, { x: 1.1, y: 1.1 } as any);
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
  async updateMovementSystem() {
    await this.world.execute(this.moveSystem);
  },
  getMovementSystemUpdateCount() {
    return updateCount;
  },
};

export default library;
