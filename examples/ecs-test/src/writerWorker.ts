import { setupWorker, useQuery, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

setupWorker(execute);

const entitiesQuery = useQuery((q) => q.with(Position, Velocity));

function execute(ctx: Context) {
  const entities = entitiesQuery.current(ctx);

  for (const entityId of entities) {
    const position = Position.write(entityId);

    position.x += 1;
    position.y += 1;
  }
}
