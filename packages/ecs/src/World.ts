import { Entity } from "./Entity";
import type { Query, QueryBuilder } from "./Query";
import {
  Query as QueryClass,
  QueryBuilder as QueryBuilderClass,
} from "./Query";
import { QueryManager } from "./QueryManager";
import { System, SYSTEM_CREATION_KEY } from "./System";

/**
 * World class - the "world" in traditional ECS frameworks.
 * Manages entities, components, and serves as the central point for ECS operations.
 */
export class World {
  private entities: Map<number, Entity>;
  private entitySet: Set<Entity>;
  private nextId: number;
  private queryManager: QueryManager;

  constructor() {
    this.entities = new Map();
    this.entitySet = new Set();
    this.nextId = 1;
    this.queryManager = new QueryManager();
  }

  /**
   * Create a new entity in this world
   * @returns The newly created entity
   */
  createEntity(): Entity {
    const entity = new Entity(this.nextId++, this.queryManager);
    this.entities.set(entity.getId(), entity);
    this.entitySet.add(entity);
    return entity;
  }

  /**
   * Remove an entity from this world
   * @param entity - The entity instance to remove
   * @returns True if removed, false if not found
   */
  removeEntity(entity: Entity): boolean {
    const entityId = entity.getId();
    const existingEntity = this.entities.get(entityId);

    if (existingEntity) {
      existingEntity.dispose();
      this.entitySet.delete(existingEntity);
      this.queryManager.handleEntityRemove(entity);
      return this.entities.delete(entityId);
    }

    return false;
  }

  /**
   * Create a query to find entities matching specific criteria
   * @param builder - Function that builds the query using the QueryBuilder API
   * @returns A Query object that provides matching entities
   */
  query(builder: (q: QueryBuilder) => QueryBuilder): Query {
    const queryBuilder = new QueryBuilderClass();
    builder(queryBuilder);
    const matcher = queryBuilder._build();
    const query = new QueryClass(matcher, this.entitySet);
    this.queryManager.addQuery(query);
    return query;
  }

  /**
   * Create a system instance
   * @param SystemClass - The System class to instantiate
   * @returns An instance of the system
   */
  createSystem<T extends System>(
    SystemClass: typeof System &
      (new (world: World, key: typeof SYSTEM_CREATION_KEY) => T)
  ): T {
    const system = SystemClass._create(this, SYSTEM_CREATION_KEY);

    // Wrap the execute method in a proxy to add before/after hooks
    const originalExecute = system.execute.bind(system);
    system.execute = new Proxy(originalExecute, {
      apply: (target, thisArg, argumentsList: any[]) => {
        system._beforeExecute();
        const result = Reflect.apply(target, thisArg, argumentsList);
        system._afterExecute();
        return result;
      },
    }) as any;

    return system;
  }

  /**
   * Dispose of the world and free all resources
   */
  dispose(): void {
    for (const entity of this.entities.values()) {
      entity.dispose();
    }
    this.entities.clear();
    this.entitySet.clear();
    this.queryManager.clear();
    this.nextId = 1;
  }
}
