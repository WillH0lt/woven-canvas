import type { Entity } from "./Entity";
import type { Query } from "./Query";

/**
 * QueryManager class - manages the set of queries and their lifecycle.
 * Handles entity updates and removals across all registered queries.
 */
export class QueryManager {
  private queries: Set<Query>;

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
   */
  handleEntityShapeChange(entity: Entity, prevBitmask: bigint): void {
    for (const query of this.queries) {
      query._handleEntityShapeChange(entity, prevBitmask);
    }
  }

  /**
   * Notify all queries that an entity was removed
   * Each query will remove the entity from its tracking
   * @param entity - The entity that was removed
   */
  handleEntityRemove(entity: Entity): void {
    for (const query of this.queries) {
      query._handleEntityRemove(entity);
    }
  }

  /**
   * Clear all queries from the manager
   */
  clear(): void {
    this.queries.clear();
  }
}
