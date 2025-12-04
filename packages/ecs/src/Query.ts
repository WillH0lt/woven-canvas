import type { Component } from "./Component";
import type { Context, QueryMasks } from "./types";
import { QueryCache } from "./QueryCache";
import { EventType, EventTypeMask } from "./EventBuffer";
import { initializeComponentInWorker } from "./Worker";

const EMPTY_UINT32_ARRAY = new Uint32Array(0);

/**
 * Helper to create an empty mask array
 */
function createEmptyMask(bytes: number): Uint8Array {
  return new Uint8Array(bytes);
}

/**
 * Helper to set a component bit in a mask array
 * Component bits are packed 8 per byte
 */
function setComponentBit(mask: Uint8Array, componentId: number): void {
  const byteIndex = Math.floor(componentId / 8);
  const bitIndex = componentId % 8;

  if (byteIndex < mask.length) {
    mask[byteIndex] |= 1 << bitIndex;
  }
}

/**
 * Helper to generate a hash string from a mask
 */
function maskToHash(mask: Uint8Array): string {
  return Array.from(mask).join(",");
}

/**
 * Helper to generate a hash string from a QueryMasks object
 */
function masksToHash(masks: QueryMasks): string {
  return `${maskToHash(masks.with)}:${maskToHash(masks.without)}:${maskToHash(
    masks.any
  )}`;
}

/**
 * A lazily-initialized query that caches matching entities.
 * Created via defineQuery() and connects to the query cache on first use.
 * Works identically on main thread and worker threads.
 *
 * The query updates its own cache by scanning the EventBuffer. The first call to
 * current(), added(), or removed() per tick triggers a unified update that:
 * 1. Scans events since the last update
 * 2. Determines which entities were added/removed from the query result
 * 3. Updates the QueryCache accordingly
 * 4. Caches added/removed arrays for subsequent calls in the same tick
 */
export class Query {
  private cache: QueryCache | null = null;
  private readonly builder: (q: QueryBuilder) => QueryBuilder;
  private masks: QueryMasks | null = null;
  private hash: string | null = null;

  /**
   * Tracks the last scanned index in the event buffer.
   * Used to efficiently scan only new events since the last update.
   */
  private lastScannedIndex: number = 0;

  /**
   * Cached results from the last update - stored per tick.
   * When any of current(), added(), or removed() is called, we update
   * all results in one pass and cache them here.
   */
  private cachedAdded = EMPTY_UINT32_ARRAY;
  private cachedRemoved = EMPTY_UINT32_ARRAY;

  /**
   * Reusable arrays to avoid allocations during updates
   */
  private addedList: number[] = [];
  private removedList: number[] = [];

  /**
   * The tick number at the time of the last update.
   * Used to determine if we need to re-process events.
   */
  private lastUpdateTick: number = -1;

  /**
   * Separate tracking for changed() since it uses different event types
   */
  private lastChangedTick: number = -1;

  /**
   * Separate scanned index for changed() events
   */
  private lastChangedScannedIndex: number = 0;

  /**
   * Cached changed results for the current tick
   */
  private cachedChanged = EMPTY_UINT32_ARRAY;

  /**
   * Cached component mask for filtering events
   */
  private queryComponentMask: Uint8Array | null = null;

  /**
   * @internal
   */
  constructor(builder: (q: QueryBuilder) => QueryBuilder) {
    this.builder = builder;
  }

  /**
   * Build and cache the query masks (lazy initialization)
   */
  private lazilyInitializeMasks(ctx: Context): void {
    if (this.masks === null) {
      // collect components that need initialization
      const tempBuilder = new QueryBuilder(ctx.componentCount);
      const configuredTempBuilder = this.builder(tempBuilder);

      // Initialize components BEFORE building masks (important for workers)
      for (const component of configuredTempBuilder._getComponents()) {
        // Lazily initialize components that haven't been initialized yet
        if (component.componentId === -1) {
          initializeComponentInWorker(component);
        }
      }

      // build masks with correct componentIds
      const queryBuilder = new QueryBuilder(ctx.componentCount);
      const configuredBuilder = this.builder(queryBuilder);

      this.masks = configuredBuilder._build();
      this.hash = masksToHash(this.masks);
    }
  }

  private createCache(ctx: Context): QueryCache {
    if (!this.masks || !this.hash) {
      throw new Error("Query masks or hash not initialized");
    }

    // Create new query cache
    const cache = new QueryCache(this.masks, ctx.maxEntities);

    // Get current write position
    const currentWriteIndex = ctx.eventBuffer.getWriteIndex();

    // Populate cache by scanning all ADDED events from the beginning
    const { entities } = ctx.eventBuffer.collectEntitiesInRange(
      0,
      EventType.ADDED,
      undefined
    );

    // Add entities that are still alive and match the query
    for (const entityId of entities) {
      if (ctx.entityBuffer.matches(entityId, this.masks)) {
        cache.add(entityId);
      }
    }

    // Initialize lastScannedIndex to current write position
    // so we don't process events that happened before the cache was created
    this.lastScannedIndex = currentWriteIndex;
    this.lastChangedScannedIndex = currentWriteIndex;
    this.lastUpdateTick = ctx.tick;
    this.lastChangedTick = ctx.tick;

    return cache;
  }

  /**
   * Get a combined component mask for this query (with + without + any)
   * Used to filter component events to only relevant ones
   * Cached after first call.
   */
  private getQueryComponentMask(): Uint8Array {
    if (this.queryComponentMask) {
      return this.queryComponentMask;
    }

    if (!this.masks) {
      throw new Error("Query masks not initialized");
    }

    // Combine all component masks (OR them together)
    const combined = new Uint8Array(this.masks.with.length);
    for (let i = 0; i < combined.length; i++) {
      combined[i] =
        this.masks.with[i] | this.masks.without[i] | this.masks.any[i];
    }
    this.queryComponentMask = combined;
    return combined;
  }

  /**
   * Perform a unified update of the query cache by scanning new events.
   * This is called by the first of current(), added(), or removed() per tick.
   * It computes both added and removed entities in a single pass and updates the cache.
   *
   * @param ctx - The context object
   * @returns true if an update was performed, false if already up-to-date
   */
  private updateFromEvents(ctx: Context): boolean {
    // Already up-to-date for this tick
    if (ctx.tick === this.lastUpdateTick) {
      return false;
    }

    // Fast path: check if there are any new events
    const currentWriteIndex = ctx.eventBuffer.getWriteIndex();
    if (currentWriteIndex === this.lastScannedIndex) {
      this.lastUpdateTick = ctx.tick;
      this.cachedAdded = EMPTY_UINT32_ARRAY;
      this.cachedRemoved = EMPTY_UINT32_ARRAY;
      return false;
    }

    // Get component mask for filtering events
    const queryComponentMask = this.getQueryComponentMask();

    // Collect all entities that had relevant events (reuses Set)
    const { entities, newIndex } = ctx.eventBuffer.collectEntitiesInRange(
      this.lastScannedIndex,
      EventTypeMask.ALL, // Get all event types - we'll categorize them ourselves
      queryComponentMask
    );

    // Reuse arrays - clear them first
    const addedList = this.addedList;
    const removedList = this.removedList;
    addedList.length = 0;
    removedList.length = 0;

    // Categorize entities into added and removed
    const cache = this.cache!;
    const masks = this.masks!;
    const entityBuffer = ctx.entityBuffer;

    for (const entityId of entities) {
      const existsNow = entityBuffer.has(entityId);
      const matchesNow = existsNow && entityBuffer.matches(entityId, masks);
      const wasInCache = cache.has(entityId);

      if (matchesNow && !wasInCache) {
        // Entity now matches but wasn't in cache -> added
        addedList.push(entityId);
        cache.add(entityId);
      } else if (!matchesNow && wasInCache) {
        // Entity no longer matches but was in cache -> removed
        removedList.push(entityId);
        cache.remove(entityId);
      }
    }

    // Cache the results - only allocate if we have results
    this.cachedAdded =
      addedList.length > 0 ? new Uint32Array(addedList) : EMPTY_UINT32_ARRAY;
    this.cachedRemoved =
      removedList.length > 0
        ? new Uint32Array(removedList)
        : EMPTY_UINT32_ARRAY;

    // Update tracking indices
    this.lastScannedIndex = newIndex;
    this.lastUpdateTick = ctx.tick;

    return true;
  }

  /**
   * Ensure the cache is initialized and up-to-date with recent events.
   * Called before any query method returns results.
   */
  private ensureUpdated(ctx: Context): void {
    // Initialize cache if needed
    if (this.cache === null) {
      this.cache = this.createCache(ctx);
      // New cache starts with empty added/removed/changed since we just populated it
      this.cachedAdded = EMPTY_UINT32_ARRAY;
      this.cachedRemoved = EMPTY_UINT32_ARRAY;
      this.cachedChanged = EMPTY_UINT32_ARRAY;
      return;
    }

    // Update from events if there are new ones
    this.updateFromEvents(ctx);
  }

  /**
   * Get the current matching entities.
   * Results are cached and updated incrementally from the event buffer.
   *
   * @param ctx - The context object containing the entity buffer and query cache
   * @returns An array of entity IDs matching the query criteria
   */
  current(ctx: Context): Uint32Array {
    // Lazily initialize masks on first use
    this.lazilyInitializeMasks(ctx);

    // Ensure cache is up-to-date
    this.ensureUpdated(ctx);

    return this.cache!.getDenseView();
  }

  /**
   * Get entities that were added (created) since the last time this query was checked.
   * Only returns entities that match the query criteria.
   * This includes:
   * - Newly created entities (ADDED event)
   * - Entities that now match due to component changes (COMPONENT_ADDED/COMPONENT_REMOVED)
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs that were added and match the query
   */
  added(ctx: Context): Uint32Array {
    this.lazilyInitializeMasks(ctx);

    // Ensure cache is up-to-date
    this.ensureUpdated(ctx);

    return this.cachedAdded;
  }

  /**
   * Get entities that were removed (deleted) since the last time this query was checked.
   * This includes:
   * - Deleted entities (REMOVED event)
   * - Entities that no longer match due to component changes (COMPONENT_ADDED/COMPONENT_REMOVED)
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs that were removed or no longer match
   */
  removed(ctx: Context): Uint32Array {
    this.lazilyInitializeMasks(ctx);

    // Ensure cache is up-to-date
    this.ensureUpdated(ctx);

    return this.cachedRemoved;
  }

  /**
   * Get entities whose tracked components have changed since the last time this query was checked.
   * Only returns entities that match the query criteria and have changes to tracked components.
   * Use .withTracked() in the query builder to specify which components to track.
   *
   * Note: changed() uses separate tracking from added()/removed() since it monitors
   * different event types (CHANGED vs ADDED/REMOVED/COMPONENT_ADDED/COMPONENT_REMOVED).
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs with changed tracked components
   */
  changed(ctx: Context): Uint32Array {
    this.lazilyInitializeMasks(ctx);

    // Ensure cache is initialized
    this.ensureUpdated(ctx);

    // Already up-to-date for this tick, return cached result
    if (ctx.tick === this.lastChangedTick) {
      const result = this.cachedChanged;
      this.cachedChanged = EMPTY_UINT32_ARRAY;
      return result;
    }

    const trackingMask = this.masks!.tracking;

    // If no components are tracked, return empty
    if (trackingMask.every((byte) => byte === 0)) {
      this.lastChangedTick = ctx.tick;
      this.cachedChanged = EMPTY_UINT32_ARRAY;
      return this.cachedChanged;
    }

    const { entities, newIndex } = ctx.eventBuffer.collectEntitiesInRange(
      this.lastChangedScannedIndex,
      EventType.CHANGED,
      trackingMask
    );

    // Filter to only entities that currently match the query
    const results: number[] = [];
    for (const entityId of entities) {
      if (ctx.entityBuffer.matches(entityId, this.masks!)) {
        results.push(entityId);
      }
    }

    this.lastChangedScannedIndex = newIndex;
    this.lastChangedTick = ctx.tick;
    this.cachedChanged =
      results.length > 0 ? new Uint32Array(results) : EMPTY_UINT32_ARRAY;

    return this.cachedChanged;
  }
}

/**
 * Query builder for filtering entities based on component composition
 * Uses Uint8Array bitmask operations for efficient matching (8 components per byte)
 */
export class QueryBuilder {
  private withMask: Uint8Array;
  private withoutMask: Uint8Array;
  private anyMask: Uint8Array;
  private trackingMask: Uint8Array;
  private components: Component<any>[] = [];

  constructor(componentCount: number) {
    const bytes = Math.ceil(componentCount / 8);

    this.withMask = createEmptyMask(bytes);
    this.withoutMask = createEmptyMask(bytes);
    this.anyMask = createEmptyMask(bytes);
    this.trackingMask = createEmptyMask(bytes);
  }

  /**
   * Track a component used in the query
   */
  private trackComponent(component: Component<any>): void {
    if (!this.components.includes(component)) {
      this.components.push(component);
    }
  }

  /**
   * Require entities to have all of the specified components
   * @param components - Components that must be present
   * @returns This query builder for chaining
   */
  with(...components: Component<any>[]): this {
    for (const component of components) {
      this.trackComponent(component);
      setComponentBit(this.withMask, component.componentId);
    }
    return this;
  }

  /**
   * Require entities to NOT have any of the specified components
   * @param components - Components that must NOT be present
   * @returns This query builder for chaining
   */
  without(...components: Component<any>[]): this {
    for (const component of components) {
      this.trackComponent(component);
      setComponentBit(this.withoutMask, component.componentId);
    }
    return this;
  }

  /**
   * Require entities to have at least one of the specified components
   * @param components - Components where at least one must be present
   * @returns This query builder for chaining
   */
  any(...components: Component<any>[]): this {
    for (const component of components) {
      this.trackComponent(component);
      setComponentBit(this.anyMask, component.componentId);
    }
    return this;
  }

  /**
   * Require entities to have all of the specified components AND track changes to them
   * When a tracked component's value changes, the entity will appear in query.changed
   * This combines the functionality of with() and tracking()
   * @param components - Components that must be present and should be tracked for changes
   * @returns This query builder for chaining
   */
  withTracked(...components: Component<any>[]): this {
    for (const component of components) {
      this.trackComponent(component);
      setComponentBit(this.withMask, component.componentId);
      setComponentBit(this.trackingMask, component.componentId);
    }
    return this;
  }

  /**
   * Declare components that should be initialized in workers but are not part of the query criteria.
   * This is useful when you need to read/write components that aren't used for filtering entities.
   * @param components - Components to initialize in workers (does not affect query matching)
   * @returns This query builder for chaining
   *
   * @example
   * // Query for entities with Velocity, but also access Position component
   * const query = defineQuery((q) => q.any(Velocity).using(Position));
   */
  using(...components: Component<any>[]): this {
    for (const component of components) {
      this.trackComponent(component);
    }
    return this;
  }

  /**
   * Get all components used in this query
   * @internal
   */
  _getComponents(): Component<any>[] {
    return this.components;
  }

  /**
   * Build the query matcher
   * @internal
   */
  _build(): QueryMasks {
    return {
      tracking: this.trackingMask,
      with: this.withMask,
      without: this.withoutMask,
      any: this.anyMask,
    };
  }
}

/**
 * Define a query that lazily connects to or creates a query cache on first use.
 * This allows defining queries at module scope before the context is available.
 *
 * @param builder - Function that configures the query using with/without/any methods on QueryBuilder
 * @returns A Query object with a current(ctx) method to get matching entities
 *
 * @example
 * import { setupWorker, defineQuery, type Context } from "@infinitecanvas/ecs";
 * import { Position, Velocity } from "./components";
 *
 * setupWorker(execute);
 *
 * // Define query at module scope
 * const movingEntities = defineQuery((q) => q.with(Position, Velocity));
 *
 * function execute(ctx: Context) {
 *   // Query lazily initializes on first call to current()
 *   for (const eid of movingEntities.current(ctx)) {
 *     const pos = Position.read(eid);
 *     console.log(`Entity ${eid} Position: (${pos.x}, ${pos.y})`);
 *   }
 * }
 */
export function defineQuery(builder: (q: QueryBuilder) => QueryBuilder): Query {
  return new Query(builder);
}
