import type { Context } from "../types";
import { QueryCache } from "./Cache";
import type { QueryMasks } from "./Masks";
import { QueryReader } from "./Reader";
import { SINGLETON_ENTITY_ID } from "../Component";

const EMPTY_NUMBER_ARRAY: number[] = [];

/** Per-context query instance with cached matching entities */
export class QueryInstance {
  readonly masks: QueryMasks;
  readonly cache: QueryCache | null = null;
  private reader: QueryReader;
  private readonly isSingletonQuery: boolean;

  /**
   * @internal - Use QueryDef._getInstance(ctx) instead
   */
  constructor(ctx: Context, masks: QueryMasks) {
    this.masks = masks;

    this.isSingletonQuery = masks.usesSingleton(ctx);

    if (!this.isSingletonQuery) {
      this.cache = new QueryCache(ctx.maxEntities);
    }

    this.reader = new QueryReader(0);
  }

  /** Get all matching entities (automatically partitioned for workers) */
  current(ctx: Context): Uint32Array | number[] {
    if (this.isSingletonQuery) {
      return [SINGLETON_ENTITY_ID];
    }

    this.reader.updateCache(ctx, this.cache!, this.masks);
    const allEntities = this.cache!.getDenseView();

    if (ctx.threadCount <= 1) {
      return allEntities;
    }

    return this.partitionEntities(
      allEntities,
      ctx.threadIndex,
      ctx.threadCount
    );
  }

  /** Get entities added since last check (automatically partitioned for workers) */
  added(ctx: Context): number[] {
    if (this.isSingletonQuery) {
      return EMPTY_NUMBER_ARRAY;
    }

    this.reader.updateCache(ctx, this.cache!, this.masks);
    const result = this.reader.added;

    if (ctx.threadCount > 1 && result.length > 0) {
      return this.partitionEntities(result, ctx.threadIndex, ctx.threadCount);
    }
    return result;
  }

  /** Get entities removed since last check (automatically partitioned for workers) */
  removed(ctx: Context): number[] {
    if (this.isSingletonQuery) {
      return EMPTY_NUMBER_ARRAY;
    }

    this.reader.updateCache(ctx, this.cache!, this.masks);
    const result = this.reader.removed;

    if (ctx.threadCount > 1 && result.length > 0) {
      return this.partitionEntities(result, ctx.threadIndex, ctx.threadCount);
    }
    return result;
  }

  /** Get entities with tracked component changes since last check (automatically partitioned for workers) */
  changed(ctx: Context): number[] {
    if (this.isSingletonQuery) {
      this.reader.updateSingletonChanged(ctx, this.masks);
      return this.reader.changed;
    }

    this.reader.updateCache(ctx, this.cache!, this.masks);
    const result = this.reader.changed;

    if (ctx.threadCount > 1 && result.length > 0) {
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
