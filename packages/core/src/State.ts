import type { Entity } from '@lastolivegames/becsy'
import { type Signal, signal } from '@preact/signals-core'
import { SaveToState } from './components'
import type { ISerializable } from './types'

const stateComponents: (new () => ISerializable)[] = []

export function registerStateComponent(serializable: new () => ISerializable): void {
  if (!stateComponents.includes(serializable)) {
    stateComponents.push(serializable)
  }
}

export function getStateComponents(): (new () => ISerializable)[] {
  return stateComponents
}

export class State {
  private readonly state = new Map<string, Signal<Record<string, Signal<any>>>>()

  constructor() {
    for (const stateComponent of stateComponents) {
      this.state.set(stateComponent.name, signal({}))
    }
  }

  public setComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    const signalComponents: Record<string, Signal<any>> = {}
    for (const entity of entities) {
      const id = entity.read(SaveToState).id
      const comp = entity.read(Component)
      signalComponents[id] = signal(comp.toModel())
    }

    const componentsState = this.state.get(Component.name)!
    componentsState.value = {
      ...componentsState.value,
      ...signalComponents,
    }
  }

  public removeComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    const components = this.state.get(Component.name)!
    const entityIds = new Set(entities.map((entity) => entity.read(SaveToState).id))
    components.value = Object.fromEntries(Object.entries(components.value).filter(([key]) => !entityIds.has(key)))
  }

  public getComponents<T extends ISerializable>(component: new () => T): Signal<Record<string, Signal<T>>> {
    return this.state.get(component.name)!
  }
}
