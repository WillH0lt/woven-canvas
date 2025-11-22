import type { Component } from "./Component";
import type { Entity } from "./Entity";

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
      this.withMask |= component._getBitmask();
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
      this.withoutMask |= component._getBitmask();
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
      this.anyMask |= component._getBitmask();
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
      const mask = component._getBitmask();
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

  private entitySet = new Set<Entity>();

  // Pending changes to be applied on next prepare
  private pendingAdded = new Set<Entity>();
  private pendingRemoved = new Set<Entity>();
  private pendingChanged = new Set<Entity>();

  // Cached arrays for fast iteration
  private entitiesArray: Entity[] = [];
  private addedArray: Entity[] = [];
  private removedArray: Entity[] = [];
  private changedArray: Entity[] = [];

  /**
   * Create a query with the given matcher and entity set
   * @param matcher - The query matcher to use for filtering entities
   * @param entities - The initial set of entities to filter
   */
  constructor(matcher: QueryMatcher, entities: Set<Entity>) {
    this.matcher = matcher;

    // Initialize with matching entities from the existing entity set
    for (const entity of entities) {
      if (this.matcher.matches(entity._getBitmask())) {
        this.entitySet.add(entity);
        this.entitiesArray.push(entity);
      }
    }
  }

  /**
   * Get the current array of entities matching this query
   * Optimized for fast iteration in game loops
   * @returns Array of matching entities
   */
  get current(): Entity[] {
    return this.entitiesArray;
  }

  /**
   * Get entities that were added to this query since the last time it was checked
   * @returns Array of newly added entities
   */
  get added(): Entity[] {
    return this.addedArray;
  }

  /**
   * Get entities that were removed from this query since the last time it was checked
   * @returns Array of removed entities
   */
  get removed(): Entity[] {
    return this.removedArray;
  }

  /**
   * Get entities whose tracked components changed since the last time it was checked
   * @returns Array of entities with changed components
   */
  get changed(): Entity[] {
    return this.changedArray;
  }

  /**
   * Add an entity to this query if it matches
   * Remove it if the entity no longer matches
   * @param entity - The entity that changed
   * @param prevBitmask - The entity's previous component bitmask
   * @internal
   */
  _handleEntityShapeChange(entity: Entity, prevBitmask: bigint): void {
    const prevMatches = this.matcher.matches(prevBitmask);
    const matches = this.matcher.matches(entity._getBitmask());

    if (matches && !prevMatches) {
      this.pendingAdded.add(entity);
      this.pendingRemoved.delete(entity);
    } else if (!matches && prevMatches) {
      this.pendingRemoved.add(entity);
      this.pendingAdded.delete(entity);
    }
  }

  /**
   * Remove an entity from this query
   * @param entity - The entity to remove
   * @internal
   */
  _handleEntityRemove(entity: Entity): void {
    this.pendingRemoved.add(entity);
    this.pendingAdded.delete(entity);
  }

  /**
   * Handle when a tracked component's value changes on an entity
   * @param entity - The entity whose component changed
   * @param componentBitmask - The bitmask of the component that changed
   * @internal
   */
  _handleEntityValueChange(entity: Entity, componentBitmask: bigint): void {
    // Track if entity is in the query (current or pending addition) and component is tracked
    const isInQuery =
      this.entitySet.has(entity) || this.pendingAdded.has(entity);
    if (
      isInQuery &&
      (this.matcher._getTrackingMask() & componentBitmask) !== 0n
    ) {
      this.pendingChanged.add(entity);
    }
  }

  /**
   * Clear the reactive entities lists: added, removed, changed, etc. and apply all pending changes to the query
   * @internal
   */
  _prepare(): void {
    // Clear the arrays and set
    this.addedArray.length = 0;
    this.removedArray.length = 0;
    this.changedArray.length = 0;

    // Process removals first
    if (this.pendingRemoved.size > 0) {
      for (const entity of this.pendingRemoved) {
        if (this.entitySet.has(entity)) {
          this.entitySet.delete(entity);

          this.removedArray.push(entity);

          // Remove from current array - swap with last element and pop
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
      this.pendingRemoved.clear();
    }

    // Process additions
    if (this.pendingAdded.size > 0) {
      for (const entity of this.pendingAdded) {
        if (!this.entitySet.has(entity)) {
          this.entitySet.add(entity);
          this.entitiesArray.push(entity);
          this.addedArray.push(entity);
        }
      }
      this.pendingAdded.clear();
    }

    // Process changed
    if (this.pendingChanged.size > 0) {
      for (const entity of this.pendingChanged) {
        if (this.entitySet.has(entity)) {
          this.changedArray.push(entity);
        }
      }
      this.pendingChanged.clear();
    }
  }
}
