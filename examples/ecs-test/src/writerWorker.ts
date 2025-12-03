import { setupWorker, query, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

setupWorker(execute, { Position, Velocity });

function execute(ctx: Context) {
  const entities = query(ctx, (q) => q.with(Position, Velocity));

  for (const entityId of entities) {
    const position = Position.write(entityId);

    position.x += 1;
    position.y += 1;
  }
}
