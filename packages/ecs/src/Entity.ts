import type { Component, ComponentInstance } from "./Component";
import type { QueryManager } from "./QueryManager";

/**
 * Entity class that manages multiple components
 */
export class Entity {
  private id: number;
  private components: WeakMap<Component<any>, ComponentInstance<any>>;
  private componentBitmask: bigint;
  private queryManager: QueryManager;

  constructor(id: number, queryManager: QueryManager) {
    this.id = id;
    this.components = new WeakMap();
    this.componentBitmask = 0n;
    this.queryManager = queryManager;
  }

  /**
   * Get the entity's unique ID
   */
  getId(): number {
    return this.id;
  }

  /**
   * Get the entity's component bitmask (for query matching)
   */
  getBitmask(): bigint {
    return this.componentBitmask;
  }

  /**
   * Add a component to this entity
   * @param componentDef - The component definition
   * @param data - Initial component data
   * @returns The created component instance
   */
  add<T extends Record<string, any>>(
    componentDef: Component<T>,
    data?: Partial<T>
  ): ComponentInstance<T> {
    // Check if component already exists
    if (this.components.has(componentDef)) {
      throw new Error(
        `Entity ${this.id} already has component: ${componentDef.getId()}`
      );
    }

    // Create component instance
    const instance = componentDef.from(data || {});
    this.components.set(componentDef, instance);

    const prevBitmask = this.componentBitmask;

    // Update bitmask
    this.componentBitmask |= componentDef.getBitmask();

    // Update queries
    this.queryManager.handleEntityShapeChange(this, prevBitmask);

    return instance;
  }

  /**
   * Remove a component from this entity
   * @param componentDef - The component definition to remove
   * @returns True if removed, false if component didn't exist
   */
  remove<T extends Record<string, any>>(componentDef: Component<T>): boolean {
    if (!this.components.has(componentDef)) {
      return false;
    }

    this.components.delete(componentDef);
    const prevBitmask = this.componentBitmask;

    // Update bitmask
    this.componentBitmask &= ~componentDef.getBitmask();

    // Update queries
    this.queryManager.handleEntityShapeChange(this, prevBitmask);

    return true;
  }

  /**
   * Get a component from this entity
   * @param componentDef - The component definition
   * @returns The component instance or undefined if not found
   */
  get<T extends Record<string, any>>(
    componentDef: Component<T>
  ): ComponentInstance<T> | undefined {
    return this.components.get(componentDef) as
      | ComponentInstance<T>
      | undefined;
  }

  /**
   * Check if entity has a specific component
   * @param componentDef - The component definition
   * @returns True if entity has this component
   */
  has<T extends Record<string, any>>(componentDef: Component<T>): boolean {
    return this.components.has(componentDef);
  }

  /**
   * Get all component IDs attached to this entity
   * @returns Array of component IDs
   */
  dispose(): void {
    this.components = new WeakMap();
    this.componentBitmask = 0n;
  }
}
