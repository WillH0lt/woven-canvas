import {
  setupWorker,
  defineQuery,
  type WorkerContext,
} from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

setupWorker(execute, { Position, Velocity });

const entitiesQuery = defineQuery((q) => q.with(Position, Velocity));

function execute(ctx: WorkerContext) {
  const entities = entitiesQuery.current(ctx);
  for (const eid of entities) {
    const position = Position.read(eid);
    console.log(`Entity ${eid} Position: (${position.x}, ${position.y})`);
  }
}
