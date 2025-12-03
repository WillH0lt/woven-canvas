import { setupWorker, defineQuery, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

setupWorker(execute, { Position, Velocity });

const entitiesQuery = defineQuery((q) => q.with(Position, Velocity));

function execute(ctx: Context) {
  const entities = entitiesQuery.current(ctx);

  console.log(`Entities with Position and Velocity: ${entities.length}`);

  for (const eid of entities) {
    const position = Position.read(eid);

    console.log(`Entity ${eid} Position: (${position.x}, ${position.y})`);
  }
}
