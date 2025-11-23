// import { Entity } from "./Entity";
import type { Query, QueryBuilder } from "./Query";
import {
  Query as QueryClass,
  QueryBuilder as QueryBuilderClass,
} from "./Query";
import { QueryManager } from "./QueryManager";
import { System } from "./System";
import {
  type ComponentSchema,
  type InferComponentType,
  Component,
} from "./Component";

export type EntityId = number;
export type Entity = bigint;

/**
 * World class - central manager for entities, components, and systems in the ECS framework.
 */
export class World {
  // private entitySet: Set<Entity>;

  private entityMap: Map<EntityId, Entity> = new Map();
  private queryManager: QueryManager;
  private componentIndex: number = 0;
  private entityIdCounter: number = 0;

  /**
   * Create a new world instance
   */
  constructor() {
    this.entityMap = new Map();
    this.queryManager = new QueryManager();
  }

  /**
   * Create a new entity in this world
   * @returns The newly created entity
   */
  createEntity(): EntityId {
    const entityId = this.entityIdCounter++;
    this.entityMap.set(entityId, 0n);

    return entityId;
  }

  /**
   * Remove an entity from this world
   * @param entity - The entity instance to remove
   * @returns True if removed, false if not found
   */
  removeEntity(entityId: EntityId): void {
    this.entityMap.delete(entityId);
    this.queryManager.handleEntityRemove(entityId);
  }

  /**
   * Create a system instance
   * @template T - The type of system to create
   * @param SystemClass - The System class to instantiate
   * @returns An instance of the system
   */
  createSystem<T extends System>(SystemClass: new (world: World) => T): T {
    return new SystemClass(this);
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
  createComponent<T extends ComponentSchema>(schema: T): Component<T> {
    const componentIndex = this.componentIndex++;
    return new Component<T>(schema, componentIndex);
  }

  addComponent(
    entityId: EntityId,
    component: Component<any>,
    data: any = {}
  ): void {
    let entity = this.entityMap.get(entityId);
    if (entity === undefined) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }

    // Check if entity already has this component
    if ((entity & component.bitmask) !== 0n) {
      throw new Error(
        `Entity already has component: ${component.constructor.name}`
      );
    }

    entity |= component.bitmask;
    this.entityMap.set(entityId, entity);
    component.from(entityId, data);

    this.queryManager.handleEntityShapeChange(entityId, entity);
  }

  removeComponent(entityId: EntityId, component: Component<any>): void {
    let entity = this.entityMap.get(entityId);
    if (entity === undefined) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }

    entity &= ~component.bitmask;
    this.entityMap.set(entityId, entity);

    this.queryManager.handleEntityShapeChange(entityId, entity);
  }

  hasComponent(entityId: EntityId, component: Component<any>): boolean {
    const entity = this.entityMap.get(entityId);
    if (entity === undefined) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }
    return (entity & component.bitmask) !== 0n;
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
    const query = new QueryClass(matcher, this.entityMap);
    this.queryManager.addQuery(query);
    return query;
  }

  /**
   * Execute a system with proper lifecycle hooks
   * @param system - The system instance to execute
   */
  execute(system: System): void {
    system._beforeExecute();
    system.execute();
  }

  /**
   * Dispose of the world and free all resources
   */
  dispose(): void {
    // for (const entity of this.entitySet.values()) {
    //   entity.dispose();
    // }
    // this.entitySet.clear();
    // this.queryManager.clear();
  }
}
