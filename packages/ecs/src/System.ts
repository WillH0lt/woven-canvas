import type {
  SystemFunction,
  WorkerSystemOptions,
  WorkerPriority,
} from "./types";

/**
 * Base class for all systems. Provides a unique ID for each system instance.
 */
export abstract class BaseSystemClass {
  private static systemCounter = 0;

  /** Unique identifier for this system instance */
  readonly id: number;

  /** System type discriminator */
  abstract readonly type: "main" | "worker";

  /**
   * Event buffer index from the previous execution.
   * Used for deferred entity ID reclamation.
   */
  prevEventIndex: number = 0;

  /**
   * Event buffer index at the start of the current execution.
   * Updated before each execution, then moved to prevEventIndex after.
   */
  currEventIndex: number = 0;

  constructor() {
    this.id = BaseSystemClass.systemCounter++;
  }
}

/**
 * Main thread system class.
 * Created via defineSystem().
 */
export class MainThreadSystemClass extends BaseSystemClass {
  readonly type = "main" as const;
  readonly execute: SystemFunction;

  constructor(execute: SystemFunction) {
    super();
    this.execute = execute;
  }
}

/**
 * Worker system class.
 * Created via defineWorkerSystem().
 */
export class WorkerSystemClass extends BaseSystemClass {
  readonly type = "worker" as const;
  readonly path: string;
  readonly threads: number;
  readonly priority: WorkerPriority;

  constructor(path: string, options: WorkerSystemOptions = {}) {
    super();
    this.path = path;
    this.threads = options.threads ?? 1;
    this.priority = options.priority ?? "normal";
  }
}

/**
 * Define a system that runs on the main thread.
 * @param execute - Function to execute when the system runs
 * @returns A MainThreadSystemClass object
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
export function defineSystem(execute: SystemFunction): MainThreadSystemClass {
  return new MainThreadSystemClass(execute);
}

/**
 * Define a system that runs in a web worker.
 * The worker file must use setupWorker() to define its execution logic.
 * @param workerPath - Path to the worker file (use new URL('./worker.ts', import.meta.url).href)
 * @param options - Optional configuration for worker behavior
 * @returns A WorkerSystemClass object
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
): WorkerSystemClass {
  return new WorkerSystemClass(path, options);
}
