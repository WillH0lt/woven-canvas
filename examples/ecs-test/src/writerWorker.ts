import { registerSystem, query, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

registerSystem(self, execute, { Position, Velocity });

function execute(ctx: Context) {
  // const fib = (n: number): number => {
  //   if (n <= 1) return n;
  //   return fib(n - 1) + fib(n - 2);
  // };

  const entities = query(ctx, (q) => q.with(Position, Velocity));
  for (const entityId of entities) {
    const position = Position.write(entityId);

    position.x += 1;
    position.y += 1;
  }

  // const id = Math.floor(Math.random() * 1000);
  // const t1 = performance.now();

  // // console.log(`Parallel System ${id} starting`);

  // for (let i = 0; i < 10; i++) {
  //   fib(35);
  // }

  // const t2 = performance.now();
  // // console.log(`Parallel System ${id} finished in ${t2 - t1} ms`);
}
