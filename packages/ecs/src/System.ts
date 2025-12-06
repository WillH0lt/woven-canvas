import type {
  SystemFunction,
  MainThreadSystem,
  WorkerSystem,
  WorkerSystemOptions,
} from "./types";

/**
 * Define a system that runs on the main thread.
 * @param execute - Function to execute when the system runs
 * @param components - Record of component instances used by this system
 * @returns A MainThreadSystem object
 * @example
 * ```typescript
 * const movementSystem = defineSystem((ctx) => {
 *   const entities = query(ctx, (q) => q.with(Position, Velocity));
 *   for (const entityId of entities) {
 *     const pos = Position.write(entityId);
 *     const vel = Velocity.read(entityId);
 *     pos.x += vel.x;
 *     pos.y += vel.y;
 *   }
 * }, { Position, Velocity });
 * ```
 */
export function defineSystem(execute: SystemFunction): MainThreadSystem {
  return {
    type: "main",
    execute,
    prevEventIndex: 0,
    currEventIndex: 0,
  };
}

/**
 * Define a system that runs in a web worker.
 * The worker file must use setupWorker() to define its execution logic.
 * @param workerPath - Path to the worker file (use new URL('./worker.ts', import.meta.url).href)
 * @param options - Optional configuration for worker behavior
 * @returns A WorkerSystem object
 * @example
 * ```typescript
 * // Basic usage
 * const parallelSystem = defineWorkerSystem(
 *   new URL('./physicsWorker.ts', import.meta.url).href
 * );
 *
 * // With options
 * const physicsSystem = defineWorkerSystem(
 *   new URL('./physicsWorker.ts', import.meta.url).href,
 *   { threads: 4, priority: 'high' }
 * );
 * ```
 */
export function defineWorkerSystem(
  path: string,
  options: WorkerSystemOptions = {}
): WorkerSystem {
  return {
    type: "worker",
    path,
    threads: options.threads ?? 1,
    priority: options.priority ?? "normal",
    prevEventIndex: 0,
    currEventIndex: 0,
  };
}
