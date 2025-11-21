import type { Entity } from "./Entity";
import type { World } from "./World";
import type { Query, QueryBuilder } from "./Query";

/**
 * @internal
 * Symbol used to ensure only World can create System instances
 */
export const SYSTEM_CREATION_KEY = Symbol("SYSTEM_CREATION_KEY");

/**
 * Base class for systems in the ECS framework
 * Systems contain game logic and operate on entities matching specific queries
 */
export abstract class System {
  /** @internal */
  readonly #world: World;
  readonly #queries: Query[] = [];

  /** @internal */
  constructor(world: World, _key?: typeof SYSTEM_CREATION_KEY) {
    if (_key !== SYSTEM_CREATION_KEY) {
      throw new Error(
        "Systems cannot be instantiated directly. Use world.createSystem() instead."
      );
    }
    this.#world = world;
  }

  /**
   * @internal
   * Factory method for creating system instances - only callable by World
   */
  static _create<T extends System>(
    this: new (world: World, key: typeof SYSTEM_CREATION_KEY) => T,
    world: World,
    key: typeof SYSTEM_CREATION_KEY
  ): T {
    if (key !== SYSTEM_CREATION_KEY)
      throw new Error("Use world.createSystem()");
    return new this(world, key);
  }

  /** @internal */
  _beforeExecute(): void {
    for (const query of this.#queries) {
      query._prepare();
    }
  }

  /** @internal */
  _afterExecute(): void {
    // for (const query of this.#queries) {
    //   query._clearAdded();
    // }
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
  protected createEntity(): Entity {
    return this.#world.createEntity();
  }

  /**
   * Remove an entity from the world
   * @param entity - The entity instance to remove
   * @returns True if removed, false if not found
   */
  protected removeEntity(entity: Entity): boolean {
    return this.#world.removeEntity(entity);
  }

  /**
   * Execute the system logic
   * Override this method in derived classes
   */
  abstract execute(): void;
}
