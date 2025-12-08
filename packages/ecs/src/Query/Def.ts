import type { Context, QueryMasks } from "../types";
import { QueryBuilder } from "./Builder";
import { QueryInstance } from "./Instance";

/**
 * A query definition that can be used across multiple Worlds.
 * Created via useQuery() and creates per-context Query instances on first use.
 *
 * This is a descriptor - it holds the query configuration but no runtime state.
 * Each World gets its own Query instance with isolated state.
 */
export class QueryDef {
  private readonly builder: (q: QueryBuilder) => QueryBuilder;

  private instances: Record<string, QueryInstance> = {};

  readonly id: string;

  private static queryCounter = 0;

  /**
   * @internal
   */
  constructor(builder: (q: QueryBuilder) => QueryBuilder) {
    this.builder = builder;
    this.id = `query_${QueryDef.queryCounter++}`;
  }

  private _getName(ctx: Context): string {
    return `${this.id}_${ctx.readerId}`;
  }

  /**
   * Get or create the Query instance for a specific context.
   * The Query is cached in ctx.queries for subsequent calls.
   *
   * @param ctx - The context (World) to get the query for
   * @returns The Query instance for this context
   */
  _getInstance(ctx: Context): QueryInstance {
    const name = this._getName(ctx);

    // Check if already created for this context
    let query = this.instances[name];
    if (query) {
      return query;
    }

    // Build masks with component IDs from context
    const masks = this._getMasks(ctx);

    // Create the Query instance
    query = new QueryInstance(ctx, masks);

    // Store in context for reuse
    this.instances[name] = query;

    return query;
  }

  /**
   * Get the query masks for a specific context without creating a full Query instance.
   * Useful for lightweight filtering operations that don't need caching.
   *
   * @param ctx - The context (World) to get masks for
   * @returns The query masks for entity matching
   */
  _getMasks(ctx: Context): QueryMasks {
    const queryBuilder = new QueryBuilder(ctx.componentCount, ctx);
    const configuredBuilder = this.builder(queryBuilder);
    return configuredBuilder._build();
  }

  /**
   * Get the current matching entities.
   * Convenience method that gets the Query instance and calls current().
   *
   * @param ctx - The context object
   * @returns An array of entity IDs matching the query criteria
   */
  current(ctx: Context): Uint32Array | number[] {
    return this._getInstance(ctx).current(ctx);
  }

  /**
   * Get entities that were added since the last check.
   * Convenience method that gets the Query instance and calls added().
   *
   * @param ctx - The context object
   * @returns An array of entity IDs that were added
   */
  added(ctx: Context): number[] {
    return this._getInstance(ctx).added(ctx);
  }

  /**
   * Get entities that were removed since the last check.
   * Convenience method that gets the Query instance and calls removed().
   *
   * @param ctx - The context object
   * @returns An array of entity IDs that were removed
   */
  removed(ctx: Context): number[] {
    return this._getInstance(ctx).removed(ctx);
  }

  /**
   * Get entities whose tracked components have changed.
   * Convenience method that gets the Query instance and calls changed().
   *
   * @param ctx - The context object
   * @returns An array of entity IDs with changed tracked components
   */
  changed(ctx: Context): number[] {
    return this._getInstance(ctx).changed(ctx);
  }
}

/**
 * Define a query that lazily connects to or creates a query cache on first use.
 * This allows defining queries at module scope before the context is available.
 *
 * @param builder - Function that configures the query using with/without/any methods on QueryBuilder
 * @returns A QueryDef object with current(ctx), added(ctx), removed(ctx), changed(ctx) methods
 *
 * @example
 * import { setupWorker, useQuery, type Context } from "@infinitecanvas/ecs";
 * import { Position, Velocity } from "./components";
 *
 * setupWorker(execute);
 *
 * // Define query at module scope
 * const movingEntities = useQuery((q) => q.with(Position, Velocity));
 *
 * function execute(ctx: Context) {
 *   // Query lazily initializes on first call to current()
 *   for (const eid of movingEntities.current(ctx)) {
 *     const pos = Position.read(ctx, eid);
 *     console.log(`Entity ${eid} Position: (${pos.x}, ${pos.y})`);
 *   }
 * }
 */
export function useQuery(builder: (q: QueryBuilder) => QueryBuilder): QueryDef {
  return new QueryDef(builder);
}
