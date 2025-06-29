import type { Entity } from '@lastolivegames/becsy'
import { type Signal, signal } from '@preact/signals-core'
import { Persistent } from './components'
import type { ISerializable } from './types'

export class State {
  private readonly state = new Map<string, Signal<Record<string, Signal<any>>>>()

  public addComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    const signalComponents: Record<string, Signal<any>> = {}
    for (const entity of entities) {
      const id = entity.read(Persistent).id
      const comp = entity.read(Component)
      signalComponents[id] = signal(comp.toModel())
    }

    const componentsState = this.getComponents(Component)
    componentsState.value = {
      ...componentsState.value,
      ...signalComponents,
    }
  }

  public updateComponents<T extends ISerializable>(Component: new () => T, entities: readonly Entity[]): void {
    const components = this.getComponents(Component)
    for (const entity of entities) {
      const id = entity.read(Persistent).id
      const comp = entity.read(Component)
      if (!components.value[id]) {
        console.warn(`Component with id ${id} does not exist in state for component ${Component.name}.`)
        continue
      }
      components.value[id].value = comp.toModel() as any
    }
  }

  public removeComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    const components = this.getComponents(Component)
    const entityIds = new Set(entities.map((entity) => entity.read(Persistent).id))
    components.value = Object.fromEntries(Object.entries(components.value).filter(([key]) => !entityIds.has(key)))
  }

  public getComponents<T extends ISerializable>(component: new () => T): Signal<Record<string, Signal<T>>> {
    let components = this.state.get(component.name)
    if (!components) {
      components = signal({})
      this.state.set(component.name, components)
    }
    return components
  }
}
