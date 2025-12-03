import type { Component } from "./Component";
import type { AnyContext, Context, QueryMasks } from "./types";
import { QueryCache } from "./QueryCache";

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
   * @internal
   */
  constructor(builder: (q: QueryBuilder) => QueryBuilder) {
    this.builder = builder;
  }

  /**
   * Build and cache the query masks (lazy initialization)
   */
  private ensureMasks(): void {
    if (this.masks === null) {
      const queryBuilder = new QueryBuilder();
      const configuredBuilder = this.builder(queryBuilder);
      this.masks = configuredBuilder._build();
      this.hash = `${this.masks.with}:${this.masks.without}:${this.masks.any}`;
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
      // Populate with matching entities
      for (let i = 0; i < ctx.entityBuffer.length; i++) {
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
    for (let i = 0; i < ctx.entityBuffer.length; i++) {
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
    this.ensureMasks();

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
 * import { setupWorker, defineQuery, type WorkerContext } from "@infinitecanvas/ecs";
 * import { Position, Velocity } from "./components";
 *
 * setupWorker(execute, { Position, Velocity });
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
