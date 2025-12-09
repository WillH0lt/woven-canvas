import type {
  SystemFunction,
  WorkerSystemOptions,
  WorkerPriority,
} from "./types";

/** Base class for all systems */
export abstract class BaseSystemClass {
  private static systemCounter = 0;

  /** Unique system ID */
  readonly id: number;

  /** System type discriminator */
  abstract readonly type: "main" | "worker";

  /** Event buffer index from previous execution (for deferred ID reclamation) */
  prevEventIndex: number = 0;

  /** Event buffer index at start of current execution */
  currEventIndex: number = 0;

  constructor() {
    this.id = BaseSystemClass.systemCounter++;
  }
}

/** Main thread system (created via defineSystem) */
export class MainThreadSystemClass extends BaseSystemClass {
  readonly type = "main" as const;
  readonly execute: SystemFunction;

  constructor(execute: SystemFunction) {
    super();
    this.execute = execute;
  }
}

/** Worker system (created via defineWorkerSystem) */
export class WorkerSystemClass extends BaseSystemClass {
  readonly type = "worker" as const;
  readonly path: string;
  readonly threads: number;
  readonly priority: WorkerPriority;

  constructor(path: string, options: WorkerSystemOptions = {}) {
    super();
    this.path = path;
    this.threads = options.threads ?? 1;
    this.priority = options.priority ?? "medium";
  }
}

/**
 * Define a system that runs on the main thread
 * @param execute - System execution function
 * @returns MainThreadSystemClass instance
 * @example
 * ```typescript
 * const movementSystem = defineSystem((ctx) => {
 *   for (const eid of query(ctx, (q) => q.with(Position, Velocity))) {
 *     const pos = Position.write(ctx, eid);
 *     const vel = Velocity.read(ctx, eid);
 *     pos.x += vel.x;
 *     pos.y += vel.y;
 *   }
 * });
 * ```
 */
export function defineSystem(execute: SystemFunction): MainThreadSystemClass {
  return new MainThreadSystemClass(execute);
}

/**
 * Define a system that runs in web workers.
 * Worker file must use setupWorker() to define its execution logic.
 * @param workerPath - Path to worker file (use new URL('./worker.ts', import.meta.url).href)
 * @param options - Worker configuration
 * @returns WorkerSystemClass instance
 * @example
 * ```typescript
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
