import type { World, EntityId } from "./World";
import type { Query, QueryBuilder } from "./Query";

/**
 * Base class for systems in the ECS framework
 * Systems contain game logic and operate on entities matching specific queries
 */
export abstract class System {
  /** @internal */
  readonly #world: World;
  readonly #queries: Query[] = [];

  /**
   * Create a new system
   * @param world - The world this system belongs to
   */
  constructor(world: World) {
    this.#world = world;
  }

  /**
   * Prepare all queries before system execution
   * @internal
   */
  _beforeExecute(): void {
    for (const query of this.#queries) {
      query._prepare();
    }
  }

  /**
   * Create a query for this system
   * @param builder - Function that configures the query
   * @returns A Query object with matching entities
   */
  protected query(builder: (q: QueryBuilder) => QueryBuilder): Query {
    const query = this.#world.query(builder);
    this.#queries.push(query);
    return query;
  }

  /**
   * Create a new entity in the world
   * @returns The newly created entity
   */
  protected createEntity(): EntityId {
    return this.#world.createEntity();
  }

  /**
   * Remove an entity from the world
   * @param entity - The entity instance to remove
   * @returns True if removed, false if not found
   */
  protected removeEntity(entityId: EntityId): void {
    return this.#world.removeEntity(entityId);
  }

  /**
   * Add a component to an entity
   * @param entityId - The entity ID to add the component to
   * @param component - The component to add
   * @param data - Optional initial data for the component
   */
  protected addComponent<T>(
    entityId: EntityId,
    component: any,
    data?: Partial<T>
  ): void {
    return this.#world.addComponent(entityId, component, data);
  }

  /**
   * Remove a component from an entity
   * @param entityId - The entity ID to remove the component from
   * @param component - The component to remove
   */
  protected removeComponent(entityId: EntityId, component: any): void {
    return this.#world.removeComponent(entityId, component);
  }

  /**
   * Execute the system logic
   * Override this method in derived classes.
   * Use world.execute(system) to run the system with proper lifecycle hooks.
   */
  abstract execute(): void;
}
