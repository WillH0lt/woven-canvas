import type { Query } from "./Query";
import type { EntityId, Entity } from "./World";

/**
 * QueryManager class - manages the set of queries and their lifecycle.
 * Handles entity updates and removals across all registered queries.
 */
export class QueryManager {
  private queries: Set<Query>;

  /**
   * Create a new query manager
   */
  constructor() {
    this.queries = new Set();
  }

  /**
   * Register a query with the manager
   * @param query - The query to register
   */
  addQuery(query: Query): void {
    this.queries.add(query);
  }

  /**
   * Remove a query from the manager
   * @param query - The query to remove
   * @returns True if the query was removed, false if it wasn't found
   */
  removeQuery(query: Query): boolean {
    return this.queries.delete(query);
  }

  /**
   * Notify all queries that an entity was created or updated
   * Each query will check if the entity matches and add/remove accordingly
   * @param entity - The entity that was created or updated
   * @param prevBitmask - The entity's previous component bitmask
   */
  handleEntityShapeChange(entityId: EntityId, entity: Entity): void {
    for (const query of this.queries) {
      query._handleEntityShapeChange(entityId, entity);
    }
  }

  /**
   * Notify all queries that an entity was removed
   * Each query will remove the entity from its tracking
   * @param entity - The entity that was removed
   */
  handleEntityRemove(entityId: EntityId): void {
    for (const query of this.queries) {
      query._handleEntityRemove(entityId);
    }
  }

  /**
   * Notify all queries that a component value changed on an entity
   * Each query will check if the component is tracked and add to changed list
   * @param entity - The entity whose component changed
   * @param componentBitmask - The bitmask of the component that changed
   */
  handleEntityValueChange(entity: Entity, componentBitmask: bigint): void {
    for (const query of this.queries) {
      query._handleEntityValueChange(entity, componentBitmask);
    }
  }

  /**
   * Clear all queries from the manager
   */
  clear(): void {
    this.queries.clear();
  }
}
