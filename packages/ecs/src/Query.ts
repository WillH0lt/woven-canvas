import type { Component } from "./Component";
import type { EntityId, Entity } from "./World";

/**
 * Query builder for filtering entities based on component composition
 * Uses bitmask operations for efficient matching
 */
export class QueryBuilder {
  private withMask: bigint = 0n;
  private withoutMask: bigint = 0n;
  private anyMask: bigint = 0n;
  private trackingMask: bigint = 0n;

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
  _build(): QueryMatcher {
    return new QueryMatcher(
      this.withMask,
      this.withoutMask,
      this.anyMask,
      this.trackingMask
    );
  }
}

/**
 * Internal class that performs the actual entity matching
 */
class QueryMatcher {
  /**
   * Create a query matcher with the specified criteria
   * @param withMask - Bitmask of components that must be present
   * @param withoutMask - Bitmask of components that must NOT be present
   * @param anyMask - Bitmask where at least one component must be present
   * @param trackingMask - Bitmask of components to track for value changes
   */
  constructor(
    private withMask: bigint,
    private withoutMask: bigint,
    private anyMask: bigint,
    private trackingMask: bigint
  ) {}

  /**
   * Check if an entity matches this query
   * @param bitMask - The entity's component bitmask to test
   * @returns True if the entity matches all query criteria
   */
  matches(bitMask: bigint): boolean {
    // Check 'with' criteria: entity must have ALL specified components
    if (this.withMask !== 0n && (bitMask & this.withMask) !== this.withMask) {
      return false;
    }

    // Check 'without' criteria: entity must have NONE of the specified components
    if (this.withoutMask !== 0n && (bitMask & this.withoutMask) !== 0n) {
      return false;
    }

    // Check 'any' criteria: entity must have AT LEAST ONE of the specified components
    if (this.anyMask !== 0n && (bitMask & this.anyMask) === 0n) {
      return false;
    }

    return true;
  }

  /**
   * Get the tracking mask for this query
   * @returns The bitmask of components being tracked
   * @internal
   */
  _getTrackingMask(): bigint {
    return this.trackingMask;
  }
}

/**
 * Query result set that provides iteration over matching entities
 * Optimized for game loop performance with fast array iteration
 */
export class Query {
  private matcher: QueryMatcher;

  private entitySet = new Set<EntityId>();

  // Pending changes tracked with Sets for O(1) lookups
  private pendingAddedSet = new Set<EntityId>();
  private pendingRemovedSet = new Set<EntityId>();
  private pendingChangedSet = new Set<EntityId>();

  // Cached arrays for fast iteration
  private entitiesArray: EntityId[] = [];
  private addedArray: EntityId[] = [];
  private removedArray: EntityId[] = [];
  private changedArray: EntityId[] = [];

  // Track if we need to update arrays
  private needsUpdate = false;

  /**
   * Create a query with the given matcher and entity set
   * @param matcher - The query matcher to use for filtering entities
   * @param entities - The initial set of entities to filter
   */
  constructor(matcher: QueryMatcher, entities: Map<EntityId, Entity>) {
    this.matcher = matcher;

    // Initialize with matching entities from the existing entity set
    for (const [entityId, entity] of entities.entries()) {
      if (this.matcher.matches(entity)) {
        this.entitySet.add(entityId);
        this.entitiesArray.push(entityId);
      }
    }
  }

  /**
   * Get the current array of entities matching this query
   * Optimized for fast iteration in game loops
   * @returns Array of matching entities
   */
  get current(): EntityId[] {
    return this.entitiesArray;
  }

  /**
   * Get entities that were added to this query since the last time it was checked
   * @returns Array of newly added entities
   */
  get added(): EntityId[] {
    return this.addedArray;
  }

  /**
   * Get entities that were removed from this query since the last time it was checked
   * @returns Array of removed entities
   */
  get removed(): EntityId[] {
    return this.removedArray;
  }

  /**
   * Get entities whose tracked components changed since the last time it was checked
   * @returns Array of entities with changed components
   */
  get changed(): EntityId[] {
    return this.changedArray;
  }

  /**
   * Add an entity to this query if it matches
   * Remove it if the entity no longer matches
   * @param entity - The entity that changed
   * @param prevBitmask - The entity's previous component bitmask
   * @internal
   */
  _handleEntityShapeChange(entityId: EntityId, entity: Entity): void {
    const matches = this.matcher.matches(entity);
    const wasInQuery = this.entitySet.has(entityId);
    const isPendingAdd = this.pendingAddedSet.has(entityId);

    if (matches && !wasInQuery && !isPendingAdd) {
      // Entity now matches and wasn't in query before
      this.pendingAddedSet.add(entityId);
      this.pendingRemovedSet.delete(entityId);
      this.needsUpdate = true;
    } else if (!matches && (wasInQuery || isPendingAdd)) {
      // Entity no longer matches and was in query before (or pending add)
      this.pendingRemovedSet.add(entityId);
      this.pendingAddedSet.delete(entityId);
      this.needsUpdate = true;
    }
  }

  /**
   * Remove an entity from this query
   * @param entity - The entity to remove
   * @internal
   */
  _handleEntityRemove(entityId: EntityId): void {
    if (this.entitySet.has(entityId)) {
      this.pendingRemovedSet.add(entityId);
      this.pendingAddedSet.delete(entityId);
      this.needsUpdate = true;
    }
  }

  /**
   * Handle when a tracked component's value changes on an entity
   * @param entity - The entity whose component changed
   * @param componentBitmask - The bitmask of the component that changed
   * @internal
   */
  _handleEntityValueChange(entity: Entity, componentBitmask: bigint): void {
    // // Track if entity is in the query (current or pending addition) and component is tracked
    // const isInQuery =
    //   this.entitySet.has(entity) || this.pendingAddedSet.has(entity);
    // if (
    //   isInQuery &&
    //   (this.matcher._getTrackingMask() & componentBitmask) !== 0n
    // ) {
    //   this.pendingChangedSet.add(entity);
    // }
  }

  /**
   * Clear the reactive entities lists: added, removed, changed, etc. and apply all pending changes to the query
   * @internal
   */
  _prepare(): void {
    // Always clear the reactive arrays (even if no updates)
    this.addedArray.length = 0;
    this.removedArray.length = 0;
    this.changedArray.length = 0;

    // Early exit if no pending updates
    if (!this.needsUpdate) {
      return;
    }

    // Process removals first - use efficient swap-and-pop
    if (this.pendingRemovedSet.size > 0) {
      for (const entity of this.pendingRemovedSet) {
        if (this.entitySet.has(entity)) {
          this.entitySet.delete(entity);
          this.removedArray.push(entity);

          // Find and remove from array - swap with last element and pop
          const index = this.entitiesArray.indexOf(entity);
          if (index !== -1) {
            const lastIndex = this.entitiesArray.length - 1;
            if (index !== lastIndex) {
              this.entitiesArray[index] = this.entitiesArray[lastIndex];
            }
            this.entitiesArray.pop();
          }
        }
      }
      this.pendingRemovedSet.clear();
    }

    // Process additions
    if (this.pendingAddedSet.size > 0) {
      for (const entity of this.pendingAddedSet) {
        if (!this.entitySet.has(entity)) {
          this.entitySet.add(entity);
          this.entitiesArray.push(entity);
          this.addedArray.push(entity);
        }
      }
      this.pendingAddedSet.clear();
    }

    // Process changed
    if (this.pendingChangedSet.size > 0) {
      for (const entity of this.pendingChangedSet) {
        if (this.entitySet.has(entity)) {
          this.changedArray.push(entity);
        }
      }
      this.pendingChangedSet.clear();
    }

    this.needsUpdate = false;
  }
}
