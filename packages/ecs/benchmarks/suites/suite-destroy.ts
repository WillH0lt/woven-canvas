import type { BenchmarkContext } from "../types";

export default {
  name: "Destroy",
  iterations: 10000,
  setup(ctx: BenchmarkContext) {
    ctx.setup();
  },
  perform(ctx: BenchmarkContext) {
    const entity = ctx.createEntity();

    ctx.addPositionComponent(entity);
    ctx.addVelocityComponent(entity);

    ctx.destroyEntity(entity);
  },
};
