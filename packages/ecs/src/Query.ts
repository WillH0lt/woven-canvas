import type { ComponentDef } from "./Component";
import type { Context, EntityId, QueryMasks } from "./types";
import type { ComponentSchema } from "./Component/types";
import { QueryCache } from "./QueryCache";
import { EventType, EventTypeMask, type EventTypeValue } from "./EventBuffer";

const EMPTY_UINT32_ARRAY = new Uint32Array(0);
const EMPTY_NUMBER_ARRAY: number[] = [];

/**
 * Result of processing events for a query
 */
export interface QueryEventResult {
  /** Entity IDs that entered the query (now match, didn't before) */
  added: EntityId[];
  /** Entity IDs that left the query (no longer match, did before) */
  removed: EntityId[];
  /** Entity IDs with tracked component changes (still in query) */
  changed: EntityId[];
}

/**
 * Raw event structure from EventBuffer
 */
export interface RawEvent {
  entityId: EntityId;
  eventType: EventTypeValue;
  componentId: number;
}

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
 * Check if a component ID is set in a mask
 */
function isComponentInMask(mask: Uint8Array, componentId: number): boolean {
  const byteIndex = componentId >> 3;
  const bitIndex = componentId & 7;
  return byteIndex < mask.length && (mask[byteIndex] & (1 << bitIndex)) !== 0;
}

/**
 * Process raw events and determine which entities entered/left the query and which had tracked changes.
 * This is the core logic shared between Query and World.sync().
 *
 * @param rawEvents - Array of raw events from EventBuffer
 * @param masks - Query masks for filtering
 * @param matchedEntities - Set of entity IDs currently matched (will be mutated)
 * @param ctx - Context for checking current entity state
 * @returns Object with added, removed, and changed entity information
 */
export function processQueryEvents(
  rawEvents: RawEvent[],
  masks: QueryMasks,
  matchedEntities: Set<EntityId>,
  ctx: Context
): QueryEventResult {
  const added: EntityId[] = [];
  const removed: EntityId[] = [];
  const changed: EntityId[] = [];

  // Track entities already processed this batch to avoid duplicates
  const addedThisBatch = new Set<EntityId>();
  const removedThisBatch = new Set<EntityId>();
  const changedThisBatch = new Set<EntityId>();

  for (const raw of rawEvents) {
    const entityId = raw.entityId;
    const wasMatched = matchedEntities.has(entityId);

    if (raw.eventType === EventType.REMOVED) {
      // Entity was deleted from world
      if (wasMatched && !removedThisBatch.has(entityId)) {
        removedThisBatch.add(entityId);
        matchedEntities.delete(entityId);
        removed.push(entityId);
      }
    } else if (raw.eventType === EventType.ADDED) {
      // Entity was created - check if it matches query
      const matchesNow = ctx.entityBuffer.matches(entityId, masks);
      if (matchesNow && !wasMatched && !addedThisBatch.has(entityId)) {
        addedThisBatch.add(entityId);
        matchedEntities.add(entityId);
        added.push(entityId);
      }
    } else if (
      raw.eventType === EventType.COMPONENT_ADDED ||
      raw.eventType === EventType.COMPONENT_REMOVED
    ) {
      // Component added/removed - check if entity entered or left query
      const matchesNow =
        ctx.entityBuffer.has(entityId) &&
        ctx.entityBuffer.matches(entityId, masks);

      if (matchesNow && !wasMatched && !addedThisBatch.has(entityId)) {
        // Entity now matches query
        addedThisBatch.add(entityId);
        matchedEntities.add(entityId);
        added.push(entityId);
      } else if (!matchesNow && wasMatched && !removedThisBatch.has(entityId)) {
        // Entity no longer matches query
        removedThisBatch.add(entityId);
        matchedEntities.delete(entityId);
        removed.push(entityId);
      }
    } else if (raw.eventType === EventType.CHANGED) {
      // Component data changed - only emit if entity is in query and component is tracked
      const stillMatched = matchedEntities.has(entityId);
      if (stillMatched && masks.hasTracking) {
        const isTracked = isComponentInMask(masks.tracking, raw.componentId);
        if (isTracked && !changedThisBatch.has(entityId)) {
          changedThisBatch.add(entityId);
          changed.push(entityId);
        }
      }
    }
  }

  return { added, removed, changed };
}

/**
 * A per-context query instance that caches matching entities.
 * Created from a QueryDef when first used with a specific context.
 *
 * The query updates its own cache by scanning the EventBuffer. The first call to
 * current(), added(), or removed() per tick triggers a unified update that:
 * 1. Scans events since the last update
 * 2. Determines which entities were added/removed from the query result
 * 3. Updates the QueryCache accordingly
 * 4. Caches added/removed arrays for subsequent calls in the same tick
 */
export class Query {
  readonly cache: QueryCache;
  readonly masks: QueryMasks;

  private lastScannedIndex: number;
  private lastUpdateTick: number;
  private cachedAdded: number[] = EMPTY_NUMBER_ARRAY;
  private cachedRemoved: number[] = EMPTY_NUMBER_ARRAY;
  private cachedChanged: number[] = EMPTY_NUMBER_ARRAY;
  /** Tracked entities as a Set for use with processQueryEvents */
  private matchedEntities: Set<EntityId>;

  /**
   * @internal - Use QueryDef._getInstance(ctx) instead
   */
  constructor(ctx: Context, masks: QueryMasks) {
    this.masks = masks;

    // Create the query cache
    this.cache = new QueryCache(ctx.maxEntities);

    // Get current write position
    const currentWriteIndex = ctx.eventBuffer.getWriteIndex();

    // Populate cache by scanning all ADDED events from the beginning
    const { entities } = ctx.eventBuffer.collectEntitiesInRange(
      0,
      EventTypeMask.QUERY_ADDED,
      undefined
    );

    // Initialize matched entities set for tracking
    this.matchedEntities = new Set<EntityId>();

    // Add entities that are still alive and match the query
    for (const entityId of entities) {
      if (ctx.entityBuffer.matches(entityId, masks)) {
        this.cache.add(entityId);
        this.matchedEntities.add(entityId);
      }
    }

    // Initialize tracking indices to current position
    this.lastScannedIndex = currentWriteIndex;
    this.lastUpdateTick = ctx.tick;
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
      this.cachedAdded = EMPTY_NUMBER_ARRAY;
      this.cachedRemoved = EMPTY_NUMBER_ARRAY;
      return false;
    }

    // Read raw events
    const { events: rawEvents, newIndex } = ctx.eventBuffer.readEvents(
      this.lastScannedIndex
    );

    // Use shared logic to process events
    const result = processQueryEvents(
      rawEvents,
      this.masks,
      this.matchedEntities,
      ctx
    );

    // Update the QueryCache to match the matchedEntities set
    for (const entityId of result.added) {
      this.cache.add(entityId);
    }
    for (const entityId of result.removed) {
      this.cache.remove(entityId);
    }

    // Cache the results
    this.cachedAdded =
      result.added.length > 0 ? result.added : EMPTY_NUMBER_ARRAY;
    this.cachedRemoved =
      result.removed.length > 0 ? result.removed : EMPTY_NUMBER_ARRAY;
    this.cachedChanged =
      result.changed.length > 0 ? result.changed : EMPTY_NUMBER_ARRAY;

    // Partition for multi-threaded access
    if (ctx.threadCount > 1) {
      this.cachedAdded = this.partitionEntities(
        this.cachedAdded,
        ctx.threadIndex,
        ctx.threadCount
      );
      this.cachedRemoved = this.partitionEntities(
        this.cachedRemoved,
        ctx.threadIndex,
        ctx.threadCount
      );
      this.cachedChanged = this.partitionEntities(
        this.cachedChanged,
        ctx.threadIndex,
        ctx.threadCount
      );
    }

    // Update tracking indices
    this.lastScannedIndex = newIndex;
    this.lastUpdateTick = ctx.tick;

    return true;
  }

  /**
   * Ensure the cache is up-to-date with recent events.
   * Called before any query method returns results.
   */
  private ensureUpdated(ctx: Context): void {
    this.updateFromEvents(ctx);
  }

  /**
   * Get the current matching entities.
   * Results are cached and updated incrementally from the event buffer.
   *
   * When running in a worker with multiple threads (threadCount > 1),
   * results are automatically partitioned so each thread processes
   * a different subset of entities.
   *
   * @param ctx - The context object containing the entity buffer and query cache
   * @returns An array of entity IDs matching the query criteria
   */
  current(ctx: Context): Uint32Array | number[] {
    this.ensureUpdated(ctx);
    const allEntities = this.cache.getDenseView();

    // If single-threaded, return all entities
    if (ctx.threadCount <= 1) {
      return allEntities;
    }

    // Partition entities across threads
    return this.partitionEntities(
      allEntities,
      ctx.threadIndex,
      ctx.threadCount
    );
  }

  /**
   * Partition an array of entities for a specific thread.
   * Uses simple modulo distribution: entity goes to thread (entityId % threadCount).
   * This ensures consistent, deterministic partitioning without communication.
   *
   * @param entities - Array of entity IDs to partition
   * @param threadIndex - Index of the current thread (0-based)
   * @param threadCount - Total number of threads
   * @returns Array of entity IDs belonging to this thread's partition
   */
  private partitionEntities(
    entities: Uint32Array | number[],
    threadIndex: number,
    threadCount: number
  ): number[] {
    // Build the partitioned result
    const result: number[] = [];
    for (let i = 0; i < entities.length; i++) {
      if (entities[i] % threadCount === threadIndex) {
        result.push(entities[i]);
      }
    }

    return result.length > 0 ? result : EMPTY_NUMBER_ARRAY;
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
  added(ctx: Context): number[] {
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
  removed(ctx: Context): number[] {
    this.ensureUpdated(ctx);
    return this.cachedRemoved;
  }

  /**
   * Get entities whose tracked components have changed since the last time this query was checked.
   * Only returns entities that match the query criteria and have changes to tracked components.
   * Use .tracking() in the query builder to specify which components to track.
   *
   * @param ctx - The context object containing the entity buffer and event buffer
   * @returns An array of entity IDs with changed tracked components
   */
  changed(ctx: Context): number[] {
    this.ensureUpdated(ctx);
    return this.cachedChanged;
  }
}

/**
 * A query definition that can be used across multiple Worlds.
 * Created via useQuery() and creates per-context Query instances on first use.
 *
 * This is a descriptor - it holds the query configuration but no runtime state.
 * Each World gets its own Query instance with isolated state.
 */
export class QueryDef {
  private readonly builder: (q: QueryBuilder) => QueryBuilder;

  /**
   * Unique name for this query, used as key in context.queries
   */
  readonly name: string;

  private static queryCounter = 0;

  /**
   * @internal
   */
  constructor(builder: (q: QueryBuilder) => QueryBuilder) {
    this.builder = builder;
    this.name = `query_${QueryDef.queryCounter++}`;
  }

  /**
   * Get or create the Query instance for a specific context.
   * The Query is cached in ctx.queries for subsequent calls.
   *
   * @param ctx - The context (World) to get the query for
   * @returns The Query instance for this context
   */
  _getInstance(ctx: Context): Query {
    // Check if already created for this context
    let query = ctx.queries[this.name];
    if (query) {
      return query;
    }

    // Build masks with component IDs from context
    const masks = this._getMasks(ctx);

    // Create the Query instance
    query = new Query(ctx, masks);

    // Store in context for reuse
    ctx.queries[this.name] = query;

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
 * Query builder for filtering entities based on component composition
 * Uses Uint8Array bitmask operations for efficient matching (8 components per byte)
 */
export class QueryBuilder {
  private withMask: Uint8Array;
  private withoutMask: Uint8Array;
  private anyMask: Uint8Array;
  private trackingMask: Uint8Array;
  private ctx: Context;

  constructor(componentCount: number, ctx: Context) {
    const bytes = Math.ceil(componentCount / 8);

    this.withMask = createEmptyMask(bytes);
    this.withoutMask = createEmptyMask(bytes);
    this.anyMask = createEmptyMask(bytes);
    this.trackingMask = createEmptyMask(bytes);
    this.ctx = ctx;
  }

  /**
   * Get the component ID from the context for a given ComponentDef
   */
  private getComponentId(componentDef: ComponentDef<ComponentSchema>): number {
    const component = this.ctx.components[componentDef.name];
    if (!component) {
      throw new Error(
        `Component "${componentDef.name}" is not registered with this World.`
      );
    }
    return component.componentId;
  }

  /**
   * Require entities to have all of the specified components
   * @param componentDefs - Components that must be present
   * @returns This query builder for chaining
   */
  with(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      setComponentBit(this.withMask, this.getComponentId(componentDef));
    }
    return this;
  }

  /**
   * Require entities to NOT have any of the specified components
   * @param componentDefs - Components that must NOT be present
   * @returns This query builder for chaining
   */
  without(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      setComponentBit(this.withoutMask, this.getComponentId(componentDef));
    }
    return this;
  }

  /**
   * Require entities to have at least one of the specified components
   * @param componentDefs - Components where at least one must be present
   * @returns This query builder for chaining
   */
  any(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      setComponentBit(this.anyMask, this.getComponentId(componentDef));
    }
    return this;
  }

  /**
   * Require entities to have all of the specified components AND track changes to them
   * When a tracked component's value changes, the entity will appear in query.changed
   * This combines the functionality of with() and tracking()
   * @param componentDefs - Components that must be present and should be tracked for changes
   * @returns This query builder for chaining
   */
  tracking(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      const componentId = this.getComponentId(componentDef);
      setComponentBit(this.withMask, componentId);
      setComponentBit(this.trackingMask, componentId);
    }
    return this;
  }

  /**
   * Build the query matcher
   * @internal
   */
  _build(): QueryMasks {
    // Pre-compute whether each mask has any non-zero values
    // This allows fast-path skipping in EntityBuffer.matches()
    const hasTracking = !this.trackingMask.every((byte) => byte === 0);
    const hasWith = !this.withMask.every((byte) => byte === 0);
    const hasWithout = !this.withoutMask.every((byte) => byte === 0);
    const hasAny = !this.anyMask.every((byte) => byte === 0);

    return {
      tracking: this.trackingMask,
      with: this.withMask,
      without: this.withoutMask,
      any: this.anyMask,
      hasTracking,
      hasWith,
      hasWithout,
      hasAny,
    };
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
