import type { BaseComponent } from './BaseComponent'

export class ComponentRegistry {
  private static _instance: ComponentRegistry | null = null

  static get instance(): ComponentRegistry {
    if (!ComponentRegistry._instance) {
      ComponentRegistry._instance = new ComponentRegistry()
    }
    return ComponentRegistry._instance
  }

  private readonly _components: (new () => BaseComponent)[] = []

  private constructor() {}

  public get components(): (new () => BaseComponent)[] {
    return Object.values(this._components)
  }

  public registerComponent(component: new () => BaseComponent): void {
    if (!this._components.includes(component)) {
      this._components.push(component)
    }
  }
}
