import type { Component } from "./Component";
import type { AnyContext, Context, QueryMasks } from "./types";
import { QueryCache } from "./QueryCache";
import { EventType } from "./EventBuffer";
import { initializeComponentInWorker } from "./Worker";

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
 * On the main thread, results are cached. On workers, results are calculated fresh each time.
 */
export class Query {
  private cache: QueryCache | null = null;
  private readonly builder: (q: QueryBuilder) => QueryBuilder;
  private masks: QueryMasks | null = null;
  private hash: string | null = null;

  /**
   * Tracks the last scanned index in the event buffer for each reactive query type.
   * This allows efficient incremental scanning instead of scanning all events.
   * Initialized to 0 (start of buffer).
   */
  private lastScannedIndexAdded: number = 0;
  private lastScannedIndexRemoved: number = 0;
  private lastScannedIndexChanged: number = 0;

  /**
   * @internal
   */
  constructor(builder: (q: QueryBuilder) => QueryBuilder) {
    this.builder = builder;
  }

  /**
   * Build and cache the query masks (lazy initialization)
   */
  private lazilyInitializeMasks(ctx: AnyContext): void {
    if (this.masks === null) {
      if (ctx.isWorker) {
        // collect components that need initialization
        const tempBuilder = new QueryBuilder(ctx.componentCount);
        const configuredTempBuilder = this.builder(tempBuilder);

        // Initialize components BEFORE building masks (important for workers)
        for (const component of configuredTempBuilder._getComponents()) {
          // In workers, lazily initialize components that haven't been initialized yet
          if (ctx.isWorker && component.componentId === -1) {
            initializeComponentInWorker(component);
          }
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
    let cache: QueryCache;

    if (!this.masks || !this.hash) {
      throw new Error("Query masks or hash not initialized");
    }

    // Check if query already exists in context cache
    if (ctx.queries?.has(this.hash)) {
      cache = ctx.queries.get(this.hash)!;
    } else {
      // Create new query cache
      cache = new QueryCache(this.masks, ctx.maxEntities);
      // Populate with matching entities (start at 1, index 0 is reserved for length)
      for (let i = 1; i < ctx.entityBuffer.length; i++) {
        if (ctx.entityBuffer.matches(i, this.masks)) {
          cache.add(i);
        }
      }

      // Store in context cache if available
      if (ctx.queries) {
        ctx.queries.set(this.hash, cache);
      }
    }

    return cache;
  }

  /**
   * Calculate matching entities without caching (for workers)
   */
  private calculateResults(ctx: AnyContext): Uint32Array {
    if (!this.masks) {
      throw new Error("Query masks not initialized");
    }

    // Allocate max possible size, then return subarray of actual matches
    const results = new Uint32Array(ctx.maxEntities);
    let count = 0;
    // Start at 1, index 0 is reserved for length
    for (let i = 1; i < ctx.entityBuffer.length; i++) {
      if (ctx.entityBuffer.matches(i, this.masks)) {
        results[count++] = i;
      }
    }

    return results.subarray(0, count);
  }

  /**
   * Get the current matching entities.
   * On the main thread, results are cached for efficiency.
   * On workers, results are calculated fresh each call.
   *
   * @param ctx - The context object containing the entity buffer and query cache
   * @returns An array of entity IDs matching the query criteria
   */
  current(ctx: AnyContext): Uint32Array {
    // Lazily initialize masks on first use
    this.lazilyInitializeMasks(ctx);

    // Workers calculate results fresh each time (no caching)
    if (ctx.isWorker) {
      return this.calculateResults(ctx);
    }

    // Main thread uses cached results
    if (this.cache === null) {
      this.cache = this.createCache(ctx);
    }

    return this.cache.getDenseView();
  }

  /**
   * Get entities that were added (created) since the last time this query was checked.
   * Only returns entities that match the query criteria.
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs that were added and match the query
   */
  added(ctx: AnyContext): Uint32Array {
    this.lazilyInitializeMasks(ctx);

    const { entities, newIndex } = ctx.eventBuffer.collectEntitiesInRange(
      this.lastScannedIndexAdded,
      EventType.ADDED
    );

    // Filter to only entities that currently match the query
    const results: number[] = [];
    for (const entityId of entities) {
      if (ctx.entityBuffer.matches(entityId, this.masks!)) {
        results.push(entityId);
      }
    }

    this.lastScannedIndexAdded = newIndex;
    return new Uint32Array(results);
  }

  /**
   * Get entities that were removed (deleted) since the last time this query was checked.
   * Returns entity IDs even though the entities no longer exist.
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs that were removed
   */
  removed(ctx: AnyContext): Uint32Array {
    this.lazilyInitializeMasks(ctx);

    const { entities, newIndex } = ctx.eventBuffer.collectEntitiesInRange(
      this.lastScannedIndexRemoved,
      EventType.REMOVED
    );

    // Note: We can't filter by query match since the entity is deleted.
    // Return all removed entities - user can filter if needed.
    this.lastScannedIndexRemoved = newIndex;
    return entities;
  }

  /**
   * Get entities whose tracked components have changed since the last time this query was checked.
   * Only returns entities that match the query criteria and have changes to tracked components.
   * Use .withTracked() in the query builder to specify which components to track.
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs with changed tracked components
   */
  changed(ctx: AnyContext): Uint32Array {
    this.lazilyInitializeMasks(ctx);

    const trackingMask = this.masks!.tracking;

    // If no components are tracked, return empty
    if (trackingMask === 0) {
      // Still update the index to stay current
      this.lastScannedIndexChanged = ctx.eventBuffer.getWriteIndex();
      return new Uint32Array(0);
    }

    const { entities, newIndex } = ctx.eventBuffer.collectEntitiesInRange(
      this.lastScannedIndexChanged,
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

    this.lastScannedIndexChanged = newIndex;
    return new Uint32Array(results);
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
  private trackingMask: number = 0;
  private components: Component<any>[] = [];

  constructor(componentCount: number) {
    const bytes = Math.ceil(componentCount / 8);

    this.withMask = createEmptyMask(bytes);
    this.withoutMask = createEmptyMask(bytes);
    this.anyMask = createEmptyMask(bytes);
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
      // tracking still uses single number (legacy behavior for now)
      if (component.componentId < 31) {
        this.trackingMask |= 1 << component.componentId;
      }
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
 * import { setupWorker, defineQuery, type WorkerContext } from "@infinitecanvas/ecs";
 * import { Position, Velocity } from "./components";
 *
 * setupWorker(execute);
 *
 * // Define query at module scope
 * const movingEntities = defineQuery((q) => q.with(Position, Velocity));
 *
 * function execute(ctx: WorkerContext) {
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
