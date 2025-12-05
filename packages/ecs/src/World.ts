import { WorkerManager } from "./WorkerManager";
import { Component, type ComponentDef } from "./Component";
import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer, EventType } from "./EventBuffer";
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
  private context: Context;

  /**
   * Create a new world instance
   * @param componentDefs - Array of component definitions to register
   * @param options - Configuration options for the world
   * @example
   * ```typescript
   * import { Position, Velocity } from "./components";
   * const world = new World([Position, Velocity], {
   *   threads: 4,
   *   maxEntities: 50_000
   * });
   * ```
   */
  constructor(componentDefs: ComponentDef<any>[], options: WorldOptions = {}) {
    const threads =
      options.threads ??
      (typeof navigator !== "undefined"
        ? Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1)
        : 3);

    const maxEntities = options.maxEntities ?? 10_000;
    const maxEvents = options.maxEvents ?? 131_072;

    // Count the number of components
    const componentCount = componentDefs.length;

    this.workerManager = new WorkerManager(threads);

    const eventBuffer = new EventBuffer(maxEvents);

    // Create Component instances from defs and initialize them
    const componentMap: Record<string, Component<any>> = {};
    for (const def of componentDefs) {
      const component = Component.fromDef(def);
      component.initialize(this.componentIndex++, maxEntities, eventBuffer);
      componentMap[component.name] = component;
    }

    this.context = {
      entityBuffer: new EntityBuffer(maxEntities, componentCount),
      eventBuffer,
      components: componentMap,
      queries: {},
      maxEntities,
      maxEvents,
      componentCount,
      pool: Pool.create(maxEntities),
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
    const ctx = this.context;
    ctx.tick++;

    const currentEventIndex = ctx.eventBuffer.getWriteIndex();

    // Shift indices: current becomes previous, record new current
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      const prevIndex = system.currEventIndex;
      system.prevEventIndex = prevIndex;
      system.currEventIndex = currentEventIndex;
    }

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

    // Reclaim entities from events that all systems have now processed.
    // Find the bounds across all systems and reclaim once.
    // This happens after all systems complete so removed entity data is still readable.
    const minPrevIndex = Math.min(...systems.map((s) => s.prevEventIndex));
    const maxCurrIndex = Math.max(...systems.map((s) => s.currEventIndex));
    this.reclaimRemovedEntityIds(minPrevIndex, maxCurrIndex);
  }

  /**
   * Reclaim entity IDs from entities that this system has already seen.
   * Scans REMOVED events between the system's prevEventIndex and currEventIndex.
   * @param system - The system to reclaim entities for
   */
  private reclaimRemovedEntityIds(fromIndex: number, toIndex: number): void {
    // Nothing to reclaim on first run or if no new events
    if (fromIndex === toIndex) {
      return;
    }

    const ctx = this.context;

    // Collect all entities with REMOVED events
    const { entities } = ctx.eventBuffer.collectEntitiesInRange(
      fromIndex,
      EventType.REMOVED
    );

    // Reclaim entity IDs for entities that are still dead (not recreated)
    for (const entityId of entities) {
      if (!ctx.entityBuffer.has(entityId)) {
        // Free the entity ID back to the pool
        ctx.pool.free(entityId);
        // Clear the entity data now that we're done with it
        ctx.entityBuffer.delete(entityId);
      }
    }
  }

  /**
   * Dispose of the world and free all resources
   */
  dispose(): void {
    this.workerManager.dispose();
  }
}
