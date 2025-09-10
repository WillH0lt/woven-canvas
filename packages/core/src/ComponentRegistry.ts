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

  private readonly _singletons: (new () => BaseComponent)[] = []

  private constructor() {}

  public get components(): (new () => BaseComponent)[] {
    return Object.values(this._components)
  }

  public get componentNamesMap(): Map<string, new () => BaseComponent> {
    return new Map(this.components.map((c) => [c.name, c]))
  }

  public registerComponent(component: new () => BaseComponent): void {
    if (!this._components.includes(component)) {
      this._components.push(component)
    }
  }

  public get singletons(): (new () => BaseComponent)[] {
    return Object.values(this._singletons)
  }

  public registerSingleton(singleton: new () => BaseComponent): void {
    if (!this._singletons.includes(singleton)) {
      this._singletons.push(singleton)
    }
  }
}
