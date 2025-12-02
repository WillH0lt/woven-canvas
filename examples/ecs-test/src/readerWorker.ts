import { registerSystem, query, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

registerSystem(self, execute, { Position, Velocity });

function execute(ctx: Context) {
  const entities = query(ctx, (q) => q.with(Position, Velocity));

  for (const eid of entities) {
    const position = Position.read(eid);

    console.log(`Entity ${eid} Position: (${position.x}, ${position.y})`);
  }
}
