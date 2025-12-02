import type { Component } from "./Component";
import type { Context, QueryMasks } from "./types";

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
}

/**
 * Create a query over the entity buffer to filter entities by component composition.
 * Use this within parallel systems to iterate over entities matching specific criteria.
 *
 * @param ctx - The context object containing the entity buffer
 * @param builder - Function that configures the query using with/without/any methods on QueryBuilder
 * @returns An iterable of entity IDs matching the query criteria
 *
 * @example
 * // In a worker:
 * import { registerSystem, query } from '@infinitecanvas/ecs';
 * import { Position, Velocity, Dead } from './components';
 *
 * registerSystem(self, (ctx) => {
 *   // Query for entities with Position and Velocity, without Dead
 *   for (const entityId of query(ctx, q => q.with(Position, Velocity).without(Dead))) {
 *     // Process matching entities
 *     const pos = Position.get(entityId);
 *     console.log('Entity position:', pos);
 *   }
 * }, { Position, Velocity, Dead });
 */
export function query(
  ctx: Context,
  builder: (q: QueryBuilder) => QueryBuilder
): Iterable<number> {
  const queryBuilder = new QueryBuilder();
  const configuredBuilder = builder(queryBuilder);
  const masks = configuredBuilder._build();

  const entityBuffer = ctx.entityBuffer;

  // Return an iterable that yields matching entity IDs
  return {
    *[Symbol.iterator]() {
      const length = entityBuffer.count;
      for (let entityId = 0; entityId < length; entityId++) {
        if (
          entityBuffer.has(entityId) &&
          entityBuffer.matches(entityId, masks)
        ) {
          yield entityId;
        }
      }
    },
  };
}
