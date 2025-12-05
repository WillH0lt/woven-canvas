import {
  setupWorker,
  defineQuery,
  useSingleton,
  type Context,
} from "@infinitecanvas/ecs";
import { Position, Velocity, Mouse } from "./components";

setupWorker(execute);

// Query that tracks changes to Position
const entitiesQuery = defineQuery((q) =>
  q.with(Velocity).withTracked(Position)
);

const MouseRef = useSingleton(Mouse);

function execute(ctx: Context) {
  // Check if mouse changed and read its data
  if (MouseRef.changed(ctx)) {
    const mouse = MouseRef.read();
    console.log(`Mouse moved to (${mouse.x}, ${mouse.y})`);
  }

  // const mouse = MouseRef.read();
  // console.log(`Mouse position: (${mouse.x}, ${mouse.y})`);

  // // Get all entities that currently match the query
  // const allEntities = entitiesQuery.current(ctx);

  // // Get only entities that were added since last query
  // const addedEntities = entitiesQuery.added(ctx);

  // // Get only entities whose tracked Position changed since last query
  // const changedEntities = entitiesQuery.changed(ctx);

  // console.log(
  //   `Reader Worker: ${allEntities.length} total, ${addedEntities.length} added, ${changedEntities.length} changed`
  // );

  // for (const eid of changedEntities) {
  //   const position = Position.read(eid);
  //   console.log(
  //     `Entity ${eid} Position changed to: (${position.x}, ${position.y})`
  //   );
  // }
}
