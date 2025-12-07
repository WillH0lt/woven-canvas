import {
  setupWorker,
  useQuery,
  useSingleton,
  type Context,
} from "@infinitecanvas/ecs";
import { Position, Velocity, MouseSingleton } from "./components";

setupWorker(execute);

// Query that tracks changes to Position
const entitiesQuery = useQuery((q) => q.with(Velocity).tracking(Position));

const Mouse = useSingleton(MouseSingleton);

function execute(ctx: Context) {
  const entities = entitiesQuery.current(ctx);
  console.log(
    `Worker A | thread ${ctx.threadIndex} | entities count: ${entities.length}`
  );
}
