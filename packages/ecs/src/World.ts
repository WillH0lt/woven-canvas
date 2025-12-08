import { WorkerManager } from "./WorkerManager";
import { Component, type ComponentDef } from "./Component";
import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer, EventType } from "./EventBuffer";
import { Pool } from "./Pool";
import { type QueryDef } from "./Query";
import type { System, Context, EntityId, QueryMasks } from "./types";

/**
 * Callback type for world event subscribers
 */
export type WorldSubscribeCallback = (
  ctx: Context,
  result: {
    added: number[];
    changed: number[];
    removed: number[];
  }
) => void;

/**
 * Internal subscriber state
 */
interface Subscriber {
  queryDef: QueryDef;
  callback: WorldSubscribeCallback;
  readerId: string;
}

/**
 * Callback type for nextSync
 */
export type NextSyncCallback = (ctx: Context) => void;

export interface WorldOptions {
  /**
   * Number of worker threads to use for parallel execution
   * @default navigator.hardwareConcurrency
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
  private static worldCounter = 0;

  private componentIndex = 0;
  private workerManager: WorkerManager;
  private context: Context;

  /** Unique identifier for this world instance */
  private readonly worldId: number;
  /** Counter for generating unique subscriber IDs */
  private subscriberCounter = 0;

  /** Subscribers to world events */
  private subscribers: Subscriber[] = [];
  /** Map of component IDs to component definitions for event lookup */
  private componentIdToDef: Map<number, ComponentDef<any>> = new Map();
  /** Queue of callbacks to execute on next sync */
  private nextSyncCallbacks: NextSyncCallback[] = [];

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
        ? Math.max(1, navigator.hardwareConcurrency ?? 4)
        : 3);

    const maxEntities = options.maxEntities ?? 10_000;
    const maxEvents = options.maxEvents ?? 131_072;

    // Count the number of components
    const componentCount = componentDefs.length;

    this.workerManager = new WorkerManager(threads);

    const eventBuffer = new EventBuffer(maxEvents);
    const entityBuffer = new EntityBuffer(maxEntities, componentCount);

    // Create Component instances from defs and initialize them
    const componentMap: Record<string, Component<any>> = {};
    for (const def of componentDefs) {
      const component = Component.fromDef(def);
      component.initialize(
        this.componentIndex++,
        maxEntities,
        eventBuffer,
        entityBuffer
      );
      componentMap[component.name] = component;
      this.componentIdToDef.set(this.componentIndex - 1, def);
    }

    this.worldId = World.worldCounter++;

    this.context = {
      entityBuffer,
      eventBuffer,
      components: componentMap,
      maxEntities,
      maxEvents,
      componentCount,
      pool: Pool.create(maxEntities),
      tick: 0,
      threadIndex: 0,
      threadCount: 1,
      readerId: `world_${this.worldId}`,
    };
  }

  /**
   * Get the world context (for advanced usage only)
   * @returns The world context
   * @example
   * ```typescript
   * const ctx = world._getContext();
   * const entityId = createEntity(ctx);
   * ```
   */
  _getContext(): Context {
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

    // Sort worker systems by priority (high -> normal -> low)
    const priorityOrder = { high: 2, normal: 1, low: 0 };
    const sortedWorkerSystems = [...workerSystems].sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    const promises = sortedWorkerSystems.map((system) =>
      this.workerManager.execute(system, ctx)
    );

    for (const system of mainThreadSystems) {
      // Set readerId for this system's query instances
      const readerId = `world_${this.worldId}_system_${system.id}`;
      system.execute({
        ...ctx,
        readerId,
      });
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
   * Subscribe to world events for entities matching a query.
   * Callbacks are invoked when sync() is called.
   * @param queryDef - The query to filter events by
   * @param callback - Function called with { added, removed, changed } arrays
   * @returns Unsubscribe function
   * @example
   * ```typescript
   * const query = useQuery((q) => q.with(Position).tracking(Velocity));
   * const unsubscribe = world.subscribe(query, (ctx, { added, removed, changed }) => {
   *   for (const entityId of added) {
   *     console.log(`Entity ${entityId} entered the query`);
   *   }
   *   for (const entityId of removed) {
   *     console.log(`Entity ${entityId} left the query`);
   *   }
   *   for (const entityId of changed) {
   *     console.log(`Entity ${entityId} had a tracked component change`);
   *   }
   * });
   *
   * // Later, to stop receiving events:
   * unsubscribe();
   * ```
   */
  subscribe(queryDef: QueryDef, callback: WorldSubscribeCallback): () => void {
    const ctx = this.context;

    // Generate unique reader ID for this subscriber
    const subscriberId = this.subscriberCounter++;
    const readerId = `world_${this.worldId}_subscriber_${subscriberId}`;

    // Eagerly initialize the QueryInstance so the reader starts from current write index.
    // This ensures events written after subscription are detected in sync().
    queryDef._getInstance({
      ...ctx,
      readerId,
    });

    const subscriber: Subscriber = {
      queryDef,
      callback,
      readerId,
    };
    this.subscribers.push(subscriber);

    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Sync events to all subscribers. Call this in your game loop after execute().
   * First executes any callbacks registered via nextSync(), then
   * reads all events since the last sync for each subscriber and calls their callbacks.
   * @example
   * ```typescript
   * // In your game loop:
   * world.sync(); // Execute deferred callbacks and notify subscribers
   * await world.execute(movementSystem, renderSystem);
   * ```
   */
  sync(): void {
    this.context.tick++;

    // Execute all nextSync callbacks first
    if (this.nextSyncCallbacks.length > 0) {
      const callbacks = this.nextSyncCallbacks;
      this.nextSyncCallbacks = [];
      for (const callback of callbacks) {
        callback(this.context);
      }
    }

    if (this.subscribers.length === 0) {
      return;
    }

    for (const subscriber of this.subscribers) {
      // Set readerId so query uses this subscriber's instance
      const ctx = {
        ...this.context,
        readerId: subscriber.readerId,
      };

      const queryDef = subscriber.queryDef;

      const results = {
        added: queryDef.added(ctx),
        removed: queryDef.removed(ctx),
        changed: queryDef.changed(ctx),
      };

      // Check if there are any events to report
      if (
        results.added.length === 0 &&
        results.removed.length === 0 &&
        results.changed.length === 0
      ) {
        continue;
      }

      subscriber.callback(ctx, results);
    }
  }

  /**
   * Schedule a callback to run at the next sync() call.
   * Use this to safely modify entities and components from outside the ECS execution context
   * (e.g., from UI event handlers, network callbacks, etc.).
   *
   * @param callback - Function to execute at the next sync, receives the context
   * @example
   * ```typescript
   * // From a click handler in your UI:
   * function onClick(entityId: number) {
   *   world.nextSync((ctx) => {
   *     const color = Color.write(ctx, entityId);
   *     color.red = 255;
   *   });
   * }
   *
   * // In your game loop:
   * world.sync();  // Executes the callback
   * await world.execute(renderSystem);
   * ```
   */
  nextSync(callback: NextSyncCallback): void {
    this.nextSyncCallbacks.push(callback);
  }

  /**
   * Dispose of the world and free all resources
   */
  dispose(): void {
    this.workerManager.dispose();
  }
}
