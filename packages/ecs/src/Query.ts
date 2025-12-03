import type { Component } from "./Component";
import type { Context, QueryMasks } from "./types";
import { QueryCache } from "./QueryCache";

/**
 * A lazily-initialized query that caches matching entities.
 * Created via defineQuery() and connects to the query cache on first use.
 */
export class Query {
  private cache: QueryCache | null = null;
  private readonly builder: (q: QueryBuilder) => QueryBuilder;

  /**
   * @internal
   */
  constructor(builder: (q: QueryBuilder) => QueryBuilder) {
    this.builder = builder;
  }

  private createCache(ctx: Context): QueryCache {
    const queryBuilder = new QueryBuilder();
    const configuredBuilder = this.builder(queryBuilder);
    const masks = configuredBuilder._build();
    const hash = configuredBuilder._getHash();

    let cache: QueryCache;

    // Check if query already exists in context cache
    if (ctx.queryCache?.has(hash)) {
      cache = ctx.queryCache.get(hash)!;
    } else {
      // Create new query cache
      cache = new QueryCache(masks, ctx.maxEntities);
      // Populate with matching entities
      for (let i = 0; i < ctx.entityBuffer.length; i++) {
        if (ctx.entityBuffer.has(i) && ctx.entityBuffer.matches(i, masks)) {
          cache.add(i);
        }
      }

      // Store in context cache if available
      if (ctx.queryCache) {
        ctx.queryCache.set(hash, cache);
      }
    }

    return cache;
  }

  /**
   * Get the current matching entities from the query cache.
   * On first call, this will lazily initialize or connect to the cached query.
   *
   * @param ctx - The context object containing the entity buffer and query cache
   * @returns An iterable of entity IDs matching the query criteria
   */
  current(ctx: Context): Uint32Array {
    // Lazy initialization - connect to or create the cache on first use
    if (this.cache === null) {
      this.cache = this.createCache(ctx);
    }

    return this.cache.getDenseView();
  }
}

/**
 * Query builder for filtering entities based on component composition
 * Uses bitmask operations for efficient matching
 */
export class QueryBuilder {
  private withMask: number = 0;
  private withoutMask: number = 0;
  private anyMask: number = 0;
  private trackingMask: number = 0;

  /**
   * Require entities to have all of the specified components
   * @param components - Components that must be present
   * @returns This query builder for chaining
   */
  with(...components: Component<any>[]): this {
    for (const component of components) {
      this.withMask |= component.bitmask;
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
      this.withoutMask |= component.bitmask;
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
      this.anyMask |= component.bitmask;
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
      const mask = component.bitmask;
      this.withMask |= mask;
      this.trackingMask |= mask;
    }
    return this;
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

  /**
   * Get a unique hash key for this query configuration
   * Used to look up cached queries
   * @internal
   */
  _getHash(): string {
    return `${this.withMask}:${this.withoutMask}:${this.anyMask}`;
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
 * setupWorker(execute, { Position, Velocity });
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
