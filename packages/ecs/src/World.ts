import { WorkerManager } from "./WorkerManager";
import { Component } from "./Component";
import { EntityBuffer } from "./EntityBuffer";
import { Pool } from "./Pool";
import { QueryCache } from "./QueryCache";
import type { EntityId, System, Context } from "./types";

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
}

/**
 * World class - central manager for entities, components, and systems in the ECS framework.
 */
export class World {
  private componentIndex = 0;
  private workerManager: WorkerManager;
  private pool: Pool;
  private context: Context;
  private maxEntities: number;

  public components: Record<string, Component<any>> = {};

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
  constructor(
    components: Record<string, Component<any>>,
    options: WorldOptions = {}
  ) {
    const threads =
      options.threads ??
      (typeof navigator !== "undefined"
        ? Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1)
        : 3);

    this.maxEntities = options.maxEntities ?? 10_000;

    this.workerManager = new WorkerManager(threads);
    this.pool = Pool.create(this.maxEntities);

    // Register each component instance
    for (const componentName in components) {
      const componentInstance = components[componentName];
      componentInstance.initialize(this.componentIndex++);
      this.components[componentName] = componentInstance;
    }

    this.context = {
      entityBuffer: new EntityBuffer(this.maxEntities),
      components: this.components,
      queryCache: new Map(),
      maxEntities: this.maxEntities,
    };
  }

  /**
   * Create a new entity in this world
   * @returns The newly created entity
   */
  createEntity(): EntityId {
    const entityId = this.pool.get();
    this.context.entityBuffer.create(entityId);

    return entityId;
  }

  /**
   * Remove an entity from this world
   * @param entity - The entity instance to remove
   */
  removeEntity(entityId: EntityId): void {
    // Remove from all query caches before deleting
    if (this.context.queryCache) {
      for (const cache of this.context.queryCache.values()) {
        cache.remove(entityId);
      }
    }

    this.context.entityBuffer.delete(entityId);
    this.pool.free(entityId);
  }

  addComponent(
    entityId: EntityId,
    component: Component<any>,
    data: any = {}
  ): void {
    this.context.entityBuffer.addComponentToEntity(entityId, component.bitmask);
    component.from(entityId, data);

    // Update query caches - check if entity now matches any queries
    this.updateQueryCachesOnAdd(entityId);
  }

  removeComponent(entityId: EntityId, component: Component<any>): void {
    if (!this.context.entityBuffer.has(entityId)) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }

    this.context.entityBuffer.removeComponentFromEntity(
      entityId,
      component.bitmask
    );

    // Update query caches - check if entity no longer matches any queries
    this.updateQueryCachesOnRemove(entityId);
  }

  /**
   * Update query caches after a component was added to an entity
   * @internal
   */
  private updateQueryCachesOnAdd(entityId: EntityId): void {
    if (!this.context.queryCache) return;

    for (const cache of this.context.queryCache.values()) {
      // Skip if already in cache
      if (cache.has(entityId)) continue;

      // Check if entity now matches
      if (this.context.entityBuffer.matches(entityId, cache.getMasks())) {
        cache.add(entityId);
      }
    }
  }

  /**
   * Update query caches after a component was removed from an entity
   * @internal
   */
  private updateQueryCachesOnRemove(entityId: EntityId): void {
    if (!this.context.queryCache) return;

    for (const cache of this.context.queryCache.values()) {
      // Skip if not in cache
      if (!cache.has(entityId)) continue;

      // Check if entity no longer matches
      if (!this.context.entityBuffer.matches(entityId, cache.getMasks())) {
        cache.remove(entityId);
      }
    }
  }

  hasComponent(entityId: EntityId, component: Component<any>): boolean {
    if (!this.context.entityBuffer.has(entityId)) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }

    return this.context.entityBuffer.hasComponent(entityId, component.bitmask);
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
