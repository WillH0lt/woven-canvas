# Systems API

The ECS framework supports two types of systems: **main thread systems** and **worker systems**. Both types can be executed together using the unified `world.execute()` API.

## Main Thread Systems

Main thread systems run synchronously on the main JavaScript thread. They're ideal for logic that needs to interact with the DOM, browser APIs, or doesn't require heavy computation.

### Defining a Main Thread System

```typescript
import { defineSystem, type Context } from "@infinitecanvas/ecs";
import * as components from "./components";

const movementSystem = defineSystem((ctx: Context) => {
  const entities = query(ctx, (q) => q.with(Position, Velocity));

  for (const entityId of entities) {
    const pos = Position.write(entityId);
    const vel = Velocity.read(entityId);
    pos.x += vel.x;
    pos.y += vel.y;
  }
}, components);
```

**Parameters:**

- `execute: (ctx: Context) => void | Promise<void>` - The system execution function
- `components: Record<string, Component<any>>` - The components this system uses

## Worker Systems

Worker systems run in parallel using Web Workers. They're perfect for CPU-intensive tasks like physics simulations, AI calculations, or large-scale data processing.

### Defining a Worker System

```typescript
import { defineWorkerSystem } from "@infinitecanvas/ecs";

const physicsSystem = defineWorkerSystem(
  new URL("./physicsWorker.ts", import.meta.url).href
);
```

**Parameters:**

- `workerPath: string` - Path to the worker file (use `new URL()` with `import.meta.url`)

### Creating a Worker File

In your worker file (e.g., `physicsWorker.ts`):

```typescript
import { setupWorker, useQuery, type Context } from "@infinitecanvas/ecs";
import { Position, Velocity } from "./components";

setupWorker(execute);

const movingEntities = useQuery((q) => q.with(Position, Velocity));

function execute(ctx: Context) {
  for (const entityId of movingEntities.current(ctx)) {
    const pos = Position.write(entityId);
    const vel = Velocity.read(entityId);
    // Heavy computation here
    pos.x += vel.x * 0.016; // Delta time
    pos.y += vel.y * 0.016;
  }
}
```

## Executing Systems

Use `world.execute()` to run any combination of main thread and worker systems:

```typescript
import { World, defineSystem, defineWorkerSystem } from "@infinitecanvas/ecs";

const world = new World(components);

// Define systems
const inputSystem = defineSystem((ctx) => {
  // Handle user input
}, components);

const physicsSystem = defineWorkerSystem(
  new URL("./physicsWorker.ts", import.meta.url).href
);

const renderSystem = defineSystem((ctx) => {
  // Update DOM/canvas
}, components);

// Execute in game loop
async function loop() {
  await world.execute(
    inputSystem, // Runs first on main thread
    physicsSystem, // Runs second in parallel (worker)
    renderSystem // Runs third on main thread
  );

  requestAnimationFrame(loop);
}
```

## Execution Order

When calling `world.execute(system1, system2, system3, ...)`:

1. **Main thread systems** execute in the order provided, one after another
2. **Worker systems** execute in parallel, but the next system waits for them to complete
3. Systems can be mixed in any order

### Example Execution Flow

```typescript
await world.execute(
  mainSystem1, // Executes immediately
  mainSystem2, // Waits for mainSystem1, then executes
  workerSystem1, // Waits for mainSystem2, then runs in parallel
  workerSystem2, // Runs at the same time as workerSystem1
  mainSystem3 // Waits for both workers to finish, then executes
);
```

## Best Practices

### When to Use Main Thread Systems

- DOM manipulation
- User input handling
- Rendering
- State synchronization
- Simple, fast calculations

### When to Use Worker Systems

- Physics simulations
- Pathfinding algorithms
- Large data processing
- AI/ML computations
- Any CPU-intensive task

### Performance Tips

1. **Minimize worker overhead**: Don't use workers for trivial tasks
2. **Group related logic**: Combine multiple operations in one worker system
3. **Balance workload**: Distribute work evenly across workers
4. **Avoid thrashing**: Don't create/destroy entities in workers (read/write component data only)

## API Reference

### defineSystem()

```typescript
function defineSystem(
  execute: (ctx: Context) => void | Promise<void>,
  components: Record<string, Component<any>>
): MainThreadSystem;
```

### defineWorkerSystem()

```typescript
function defineWorkerSystem(workerPath: string): WorkerSystem;
```

### world.execute()

```typescript
async execute(...systems: System[]): Promise<void>
```

### setupWorker() (in worker files)

```typescript
function setupWorker(execute: (ctx: Context) => void | Promise<void>): void;
```
