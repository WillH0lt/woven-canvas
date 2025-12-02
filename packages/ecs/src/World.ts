import { Pool } from "./Pool";
import { Component } from "./Component";
import { EntityBufferView } from "./EntityBuffer";
import type { EntityId } from "./types";

/**
 * World class - central manager for entities, components, and systems in the ECS framework.
 */
export class World {
  private entityBuffer: EntityBufferView | null = null;
  private componentIndex: number = 0;
  private entityIdCounter: number = 0;
  private pool: Pool;

  public components: Record<string, Component<any>> = {};

  /**
   * Create a new world instance
   * @param components - Record of component instances to register with this world
   * @example
   * ```typescript
   * import { Position, Velocity } from "./components";
   * const world = new World({ Position, Velocity });
   * ```
   */
  constructor(components: Record<string, Component<any>> = {}) {
    this.pool = new Pool();

    // Register each component instance
    for (const componentName in components) {
      const componentInstance = components[componentName];
      componentInstance.initialize(this.componentIndex++);
      this.components[componentName] = componentInstance;
    }
  }

  /**
   * Create a new entity in this world
   * @returns The newly created entity
   */
  createEntity(): EntityId {
    const entityId = this.entityIdCounter++;

    if (!this.entityBuffer) {
      this.entityBuffer = new EntityBufferView();
    }

    this.entityBuffer.create(entityId);

    return entityId;
  }

  /**
   * Remove an entity from this world
   * @param entity - The entity instance to remove
   */
  removeEntity(entityId: EntityId): void {
    this.entityBuffer?.delete(entityId);
    // this.queryManager.handleEntityRemove(entityId);
  }

  addComponent(
    entityId: EntityId,
    component: Component<any>,
    data: any = {}
  ): void {
    this.entityBuffer?.addComponentToEntity(entityId, component.bitmask);
    component.from(entityId, data);

    // this.queryManager.handleEntityShapeChange(entityId);
  }

  removeComponent(entityId: EntityId, component: Component<any>): void {
    if (!this.entityBuffer?.has(entityId)) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }

    this.entityBuffer?.removeComponentFromEntity(entityId, component.bitmask);

    // this.queryManager.handleEntityShapeChange(entityId);
  }

  hasComponent(entityId: EntityId, component: Component<any>): boolean {
    if (!this.entityBuffer?.has(entityId)) {
      throw new Error(`Entity with ID ${entityId} does not exist.`);
    }

    return this.entityBuffer.hasComponent(entityId, component.bitmask);
  }

  /**
   * Execute a system in parallel using web workers
   * @param workerPath - Path to the worker file (must use setup() from @infinitecanvas/ecs)
   * @param data - Optional data to pass to each worker instance
   * @returns Promise that resolves when all parallel executions complete
   * @example
   * // Create a worker file (myWorker.ts):
   * import { setup } from '@infinitecanvas/ecs';
   * const { entityBuffer } = setup(self, (data) => {
   *   // Your parallel computation
   *   console.log('Entity buffer:', entityBuffer);
   * });
   *
   * // Then use it:
   * await world.executeInParallel('./myWorker.ts');
   */
  async executeInParallel(workerPath: string): Promise<void> {
    const batches = 1; // Math.floor(navigator.hardwareConcurrency / 2) || 2;
    await this.pool.executeInParallel(
      workerPath,
      batches,
      this.entityBuffer,
      this.components
    );
  }

  /**
   * Dispose of the world and free all resources
   */
  dispose(): void {
    this.pool.dispose();
  }
}
