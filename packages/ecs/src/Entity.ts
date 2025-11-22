import type { Component, ComponentInstance } from "./Component";
import { EventEmitter } from "./EventEmitter";

/**
 * @internal
 * Symbol used to ensure only World can create Entity instances
 */
export const ENTITY_CREATION_KEY = Symbol("ENTITY_CREATION_KEY");

/**
 * Events emitted by Entity
 * @internal
 */
interface EntityEvents {
  shapeChange: { entity: Entity; prevBitmask: bigint };
  valueChange: { entity: Entity; componentBitmask: bigint };
}

/**
 * Entity class that manages multiple components
 */
export class Entity extends EventEmitter<EntityEvents> {
  private components: Map<string, ComponentInstance<any>>;
  private componentBitmask: bigint;

  /**
   * Create a new entity
   * @param _key - Internal key to restrict construction to World class
   * @internal
   */
  constructor(_key?: typeof ENTITY_CREATION_KEY) {
    if (_key !== ENTITY_CREATION_KEY) {
      throw new Error(
        "Entities cannot be instantiated directly. Use world.createEntity() instead."
      );
    }
    super();
    this.components = new Map();
    this.componentBitmask = 0n;
  }

  /**
   * Factory method for creating entity instances - only callable by World
   * @param key - Internal key to verify caller is authorized
   * @returns A new entity instance
   * @internal
   */
  static _create(key: typeof ENTITY_CREATION_KEY): Entity {
    if (key !== ENTITY_CREATION_KEY)
      throw new Error("Use world.createEntity()");
    return new Entity(key);
  }

  /**
   * Get the entity's component bitmask (for query matching)
   * @returns The component bitmask
   * @internal
   */
  _getBitmask(): bigint {
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
    if (this.components.has(componentDef._getId())) {
      throw new Error(`Entity already has component: ${componentDef._getId()}`);
    }

    // Create component instance
    const instance = componentDef._from(data || {});

    // Listen to component changes and bubble them up
    instance.on("change", ({ componentBitmask }) => {
      this.emit("valueChange", { entity: this, componentBitmask });
    });

    this.components.set(componentDef._getId(), instance);

    const prevBitmask = this.componentBitmask;

    // Update bitmask
    this.componentBitmask |= componentDef._getBitmask();

    // Emit shape change event
    this.emit("shapeChange", { entity: this, prevBitmask });

    return instance;
  }

  /**
   * Remove a component from this entity
   * @param componentDef - The component definition to remove
   * @returns True if removed, false if component didn't exist
   */
  remove<T extends Record<string, any>>(componentDef: Component<T>): boolean {
    if (!this.components.has(componentDef._getId())) {
      return false;
    }

    this.components.delete(componentDef._getId());
    const prevBitmask = this.componentBitmask;

    // Update bitmask
    this.componentBitmask &= ~componentDef._getBitmask();

    // Emit shape change event
    this.emit("shapeChange", { entity: this, prevBitmask });

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
    return this.components.get(componentDef._getId()) as
      | ComponentInstance<T>
      | undefined;
  }

  /**
   * Check if entity has a specific component
   * @param componentDef - The component definition
   * @returns True if entity has this component
   */
  has<T extends Record<string, any>>(componentDef: Component<T>): boolean {
    return this.components.has(componentDef._getId());
  }

  /**
   * Dispose of the entity and clean up all component references
   */
  dispose(): void {
    this.components = new Map();
    this.componentBitmask = 0n;
    this.clearListeners();
  }
}
