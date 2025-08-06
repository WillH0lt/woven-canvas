import type { Entity } from '@lastolivegames/becsy'
import { type Signal, signal } from '@preact/signals-core'
import type { BaseComponent } from './BaseComponent'
import { Block } from './components'

export class State {
  private readonly state = new Map<string, Signal<Record<string, Signal<any>>>>()

  public addComponents(Comp: new () => BaseComponent, entities: readonly Entity[]): void {
    const signalComponents: Record<string, Signal<any>> = {}
    for (const entity of entities) {
      const id = entity.read(Block).id
      const comp = entity.read(Comp)
      signalComponents[id] = signal(comp.serialize())
    }

    const componentsState = this.getComponents(Comp)
    componentsState.value = {
      ...componentsState.value,
      ...signalComponents,
    }
  }

  public updateComponents(Component: new () => BaseComponent, entities: readonly Entity[]): void {
    const components = this.getComponents(Component)
    for (const entity of entities) {
      const id = entity.read(Block).id
      const comp = entity.read(Component)
      if (!components.value[id]) {
        console.warn(`Component with id ${id} does not exist in state for component ${Component.name}.`)
        continue
      }
      components.value[id].value = comp.serialize() as any
    }
  }

  public removeComponents(Comp: new () => BaseComponent, entities: readonly Entity[]): void {
    const components = this.getComponents(Comp)
    const entityIds = new Set(entities.map((entity) => entity.read(Block).id))
    components.value = Object.fromEntries(Object.entries(components.value).filter(([key]) => !entityIds.has(key)))
  }

  public getComponents<T>(component: new () => T): Signal<Record<string, Signal<T>>> {
    let components = this.state.get(component.name)
    if (!components) {
      components = signal({})
      this.state.set(component.name, components)
    }

    return components
  }

  public getComponent<T>(Comp: new (data?: any) => T, id: string): Signal<T | undefined> {
    const components = this.getComponents(Comp)
    const componentData = components.value[id]
    if (!componentData) {
      return signal(undefined)
    }

    return signal(new Comp(componentData.value))
  }
}
