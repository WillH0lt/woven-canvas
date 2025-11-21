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

  /**
   * Require entities to have all of the specified components
   * @param components - Components that must be present
   * @returns This query builder for chaining
   */
  with(...components: Component<any>[]): this {
    for (const component of components) {
      this.withMask |= component.getBitmask();
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
      this.withoutMask |= component.getBitmask();
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
      this.anyMask |= component.getBitmask();
    }
    return this;
  }

  /**
   * Build the query matcher
   * @internal
   */
  _build(): QueryMatcher {
    return new QueryMatcher(this.withMask, this.withoutMask, this.anyMask);
  }
}

/**
 * Internal class that performs the actual entity matching
 */
class QueryMatcher {
  constructor(
    private withMask: bigint,
    private withoutMask: bigint,
    private anyMask: bigint
  ) {}

  /**
   * Check if an entity matches this query
   * @param entity - The entity to test
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
}

/**
 * Query result set that provides iteration over matching entities
 */
export class Query {
  private matcher: QueryMatcher;
  private entities: Entity[] = [];
  private addedEntities: Entity[] = [];
  private removedEntities: Entity[] = [];
  private pendingAdded = new Set<Entity>();
  private pendingRemoved = new Set<Entity>();

  constructor(matcher: QueryMatcher, entities: Set<Entity>) {
    this.matcher = matcher;

    // Initialize with matching entities from the existing entity set
    for (const entity of entities) {
      if (this.matcher.matches(entity.getBitmask())) {
        this.entities.push(entity);
      }
    }
  }

  /**
   * Get the current set of entities matching this query
   */
  get current(): Entity[] {
    return this.entities;
  }

  /**
   * Get entities that were added to this query since the last time it was checked
   */
  get added(): Entity[] {
    return this.addedEntities;
  }

  /**
   * Get entities that were removed from this query since the last time it was checked
   */
  get removed(): Entity[] {
    return this.removedEntities;
  }

  /**
   * Add an entity to this query if it matches
   * Remove it if the entity no longer matches
   * @internal
   */
  _handleEntityShapeChange(entity: Entity, prevBitmask: bigint): void {
    const prevMatches = this.matcher.matches(prevBitmask);
    const matches = this.matcher.matches(entity.getBitmask());

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
   * @internal
   */
  _handleEntityRemove(entity: Entity): void {
    this.pendingRemoved.add(entity);
    this.pendingAdded.delete(entity);
  }

  /**
   * Clear the reactive entities lists: added, removed, changed, etc. and apply all pending changes to the query
   * @internal
   */
  _prepare(): void {
    this.addedEntities = [];
    this.removedEntities = [];

    // Process removals first
    for (const entity of this.pendingRemoved) {
      const entityIndex = this.entities.indexOf(entity);
      if (entityIndex !== -1) {
        this.entities.splice(entityIndex, 1);
        this.removedEntities.push(entity);
      }

      const addedIndex = this.addedEntities.indexOf(entity);
      if (addedIndex !== -1) {
        this.addedEntities.splice(addedIndex, 1);
      }
    }

    // Process additions
    for (const entity of this.pendingAdded) {
      this.entities.push(entity);
      this.addedEntities.push(entity);
    }

    // Clear pending arrays
    this.pendingAdded.clear();
    this.pendingRemoved.clear();
  }
}
