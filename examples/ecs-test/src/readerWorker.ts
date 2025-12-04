import { setupWorker, defineQuery, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

setupWorker(execute);

// Query that tracks changes to Position
const entitiesQuery = defineQuery((q) =>
  q.with(Velocity).withTracked(Position)
);

function execute(ctx: Context) {
  // Get all entities that currently match the query
  const allEntities = entitiesQuery.current(ctx);

  // Get only entities that were added since last query
  const addedEntities = entitiesQuery.added(ctx);

  // Get only entities whose tracked Position changed since last query
  const changedEntities = entitiesQuery.changed(ctx);

  console.log(
    `Reader Worker: ${allEntities.length} total, ${addedEntities.length} added, ${changedEntities.length} changed`
  );

  for (const eid of changedEntities) {
    const position = Position.read(eid);
    console.log(
      `Entity ${eid} Position changed to: (${position.x}, ${position.y})`
    );
  }
}
