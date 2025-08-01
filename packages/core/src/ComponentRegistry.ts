import type { Component } from './Component'

export class ComponentRegistry {
  private static _instance: ComponentRegistry | null = null

  static get instance(): ComponentRegistry {
    if (!ComponentRegistry._instance) {
      ComponentRegistry._instance = new ComponentRegistry()
    }
    return ComponentRegistry._instance
  }

  private readonly _components: (new () => Component)[] = []

  private constructor() {}

  public get components(): (new () => Component)[] {
    return Object.values(this._components)
  }

  public registerComponent(component: new () => Component): void {
    if (!this._components.includes(component)) {
      this._components.push(component)
    }
  }
}
