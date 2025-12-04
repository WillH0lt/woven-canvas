import { WorkerManager } from "./WorkerManager";
import { Component } from "./Component";
import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import { Pool } from "./Pool";
import type { System, Context } from "./types";

export interface WorldOptions {
  /**
   * Number of worker threads to use for parallel execution
   * @default navigator.hardwareConcurrency - 1
   */
  threads?: number;
  /**
   * Maximum number of entities the world can contain
   * @default 10_000
   */
  maxEntities?: number;
  /**
   * Maximum number of events in the event ring buffer
   * Should be large enough to hold all events between query reads
   * @default 131_072
   */
  maxEvents?: number;
}

/**
 * World class - central manager for entities, components, and systems in the ECS framework.
 */
export class World {
  private componentIndex = 0;
  private workerManager: WorkerManager;
  private pool: Pool;
  private context: Context;

  /**
   * Create a new world instance
   * @param options - Configuration options for the world
   * @example
   * ```typescript
   * import { Position, Velocity } from "./components";
   * const world = new World({
   *   components: { Position, Velocity },
   *   threads: 4,
   *   maxEntities: 50_000
   * });
   * ```
   */
  constructor(components: Component<any>[], options: WorldOptions = {}) {
    const threads =
      options.threads ??
      (typeof navigator !== "undefined"
        ? Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1)
        : 3);

    const maxEntities = options.maxEntities ?? 10_000;
    const maxEvents = options.maxEvents ?? 131_072;

    // Count the number of components
    const componentCount = Object.keys(components).length;

    this.workerManager = new WorkerManager(threads);
    this.pool = Pool.create(maxEntities);
    this.pool.get(); // Reserve index 0 for EntityBuffer metadata

    // Create the event buffer first so we can pass it to components
    const eventBuffer = new EventBuffer(maxEvents);

    // initialize each component and build component map
    const componentMap: Record<string, Component<any>> = {};
    for (const component of components) {
      component.initialize(this.componentIndex++, maxEntities, eventBuffer);
      componentMap[component.name] = component;
    }

    this.context = {
      entityBuffer: new EntityBuffer(maxEntities, componentCount),
      eventBuffer,
      components: componentMap,
      maxEntities,
      componentCount,
      pool: this.pool,
      tick: 0,
    };
  }

  /**
   * Get the context object for system execution
   * @returns Context object containing the entity buffer
   */
  getContext(): Context {
    return this.context;
  }

  /**
   * Execute one or more systems in sequence.
   * Main thread systems run synchronously in order.
   * Worker systems run in parallel and complete before the next system runs.
   * @param systems - Systems to execute
   * @example
   * ```typescript
   * const system1 = defineSystem((ctx) => { ... }, components);
   * const system2 = defineWorkerSystem('./worker.ts');
   * await world.execute(system1, system2);
   * ```
   */
  async execute(...systems: System[]): Promise<void> {
    const ctx = this.getContext();

    // Increment frame number so queries know to update their caches
    ctx.tick++;

    const workerSystems = systems.filter((system) => system.type === "worker");
    const mainThreadSystems = systems.filter(
      (system) => system.type === "main"
    );

    const promises = workerSystems.map((system) =>
      this.workerManager.execute(system, ctx)
    );

    for (const system of mainThreadSystems) {
      system.execute(ctx);
    }

    // Wait for all worker systems to complete
    await Promise.all(promises);
  }

  /**
   * Dispose of the world and free all resources
   */
  dispose(): void {
    this.workerManager.dispose();
  }
}
