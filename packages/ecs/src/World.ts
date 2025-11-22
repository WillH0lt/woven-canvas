import { Entity, ENTITY_CREATION_KEY } from "./Entity";
import type { Query, QueryBuilder } from "./Query";
import {
  Query as QueryClass,
  QueryBuilder as QueryBuilderClass,
} from "./Query";
import { QueryManager } from "./QueryManager";
import { System, SYSTEM_CREATION_KEY } from "./System";
import { Component, COMPONENT_CREATION_KEY } from "./Component";
import type { ComponentSchema, InferComponentType } from "./Component";

/**
 * World class - central manager for entities, components, and systems in the ECS framework.
 */
export class World {
  private entitySet: Set<Entity>;
  private queryManager: QueryManager;
  private componentIndex: number = 0;

  /**
   * Create a new world instance
   */
  constructor() {
    this.entitySet = new Set();
    this.queryManager = new QueryManager();
  }

  /**
   * Create a new entity in this world
   * @returns The newly created entity
   */
  createEntity(): Entity {
    const entity = Entity._create(ENTITY_CREATION_KEY);

    // Listen to entity events and forward to query manager
    entity.on("shapeChange", ({ entity, prevBitmask }) => {
      this.queryManager.handleEntityShapeChange(entity, prevBitmask);
    });

    entity.on("valueChange", ({ entity, componentBitmask }) => {
      this.queryManager.handleEntityValueChange(entity, componentBitmask);
    });

    this.entitySet.add(entity);
    return entity;
  }

  /**
   * Remove an entity from this world
   * @param entity - The entity instance to remove
   * @returns True if removed, false if not found
   */
  removeEntity(entity: Entity): boolean {
    if (this.entitySet.has(entity)) {
      entity.dispose();
      this.entitySet.delete(entity);
      this.queryManager.handleEntityRemove(entity);
      return true;
    }

    return false;
  }

  /**
   * Create a system instance
   * @template T - The type of system to create
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
        return result;
      },
    }) as any;

    return system;
  }

  /**
   * Create a component definition
   * @template T - The component schema type
   * @param schema - The component schema built using field builders
   * @returns A new Component instance with inferred type
   * @example
   * const Position = world.createComponent({
   *   x: field.float32().default(0),
   *   y: field.float32().default(0)
   * });
   */
  createComponent<T extends ComponentSchema>(
    schema: T
  ): Component<InferComponentType<T>> {
    const componentIndex = this.componentIndex++;
    return Component._create<InferComponentType<T>>(
      schema,
      componentIndex,
      COMPONENT_CREATION_KEY
    );
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
   * Dispose of the world and free all resources
   */
  dispose(): void {
    for (const entity of this.entitySet.values()) {
      entity.dispose();
    }
    this.entitySet.clear();
    this.queryManager.clear();
  }
}
