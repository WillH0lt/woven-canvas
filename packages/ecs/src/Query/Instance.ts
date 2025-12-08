import type { Context, QueryMasks } from "../types";
import { QueryCache } from "./Cache";
import { EventTypeMask } from "../EventBuffer";
import { QueryReader } from "./Reader";

const EMPTY_NUMBER_ARRAY: number[] = [];

/**
 * A per-context query instance that caches matching entities.
 * Created from a QueryDef when first used with a specific context.
 */
export class QueryInstance {
  readonly cache: QueryCache;
  readonly masks: QueryMasks;
  private reader: QueryReader;

  /**
   * @internal - Use QueryDef._getInstance(ctx) instead
   */
  constructor(ctx: Context, masks: QueryMasks) {
    this.masks = masks;
    this.cache = new QueryCache(ctx.maxEntities);

    // Populate cache with existing matching entities
    const { entities } = ctx.eventBuffer.collectEntitiesInRange(
      0,
      EventTypeMask.QUERY_ADDED,
      undefined
    );

    for (const entityId of entities) {
      if (ctx.entityBuffer.matches(entityId, masks)) {
        this.cache.add(entityId);
      }
    }

    // Start reading from current position
    this.reader = new QueryReader(ctx.eventBuffer.getWriteIndex());
  }

  /**
   * Get the current matching entities.
   */
  current(ctx: Context): Uint32Array | number[] {
    this.reader.updateCache(ctx, this.cache, this.masks);
    const allEntities = this.cache.getDenseView();

    if (ctx.threadCount <= 1) {
      return allEntities;
    }

    return this.partitionEntities(
      allEntities,
      ctx.threadIndex,
      ctx.threadCount
    );
  }

  /**
   * Get entities that were added since the last check.
   */
  added(ctx: Context): number[] {
    this.reader.updateCache(ctx, this.cache, this.masks);
    const result = this.reader.getAdded(ctx, this.cache, this.masks);

    if (ctx.threadCount > 1 && result !== EMPTY_NUMBER_ARRAY) {
      return this.partitionEntities(result, ctx.threadIndex, ctx.threadCount);
    }
    return result;
  }

  /**
   * Get entities that were removed since the last check.
   */
  removed(ctx: Context): number[] {
    this.reader.updateCache(ctx, this.cache, this.masks);
    const result = this.reader.getRemoved(ctx, this.cache, this.masks);

    if (ctx.threadCount > 1 && result !== EMPTY_NUMBER_ARRAY) {
      return this.partitionEntities(result, ctx.threadIndex, ctx.threadCount);
    }
    return result;
  }

  /**
   * Get entities whose tracked components have changed since the last check.
   */
  changed(ctx: Context): number[] {
    this.reader.updateCache(ctx, this.cache, this.masks);
    const result = this.reader.getChanged(ctx, this.cache, this.masks);

    if (ctx.threadCount > 1 && result !== EMPTY_NUMBER_ARRAY) {
      return this.partitionEntities(result, ctx.threadIndex, ctx.threadCount);
    }
    return result;
  }

  private partitionEntities(
    entities: Uint32Array | number[],
    threadIndex: number,
    threadCount: number
  ): number[] {
    const result: number[] = [];
    for (let i = 0; i < entities.length; i++) {
      if (entities[i] % threadCount === threadIndex) {
        result.push(entities[i]);
      }
    }
    return result.length > 0 ? result : EMPTY_NUMBER_ARRAY;
  }
}
