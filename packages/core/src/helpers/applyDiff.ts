import type { Query, System } from '@lastolivegames/becsy'
import { ComponentRegistry } from '../ComponentRegistry'
import type { Diff } from '../History'
import { Block, Persistent } from '../components'
import { binarySearchForId } from '../helpers/binarySearchForId'

export function applyDiff(system: System, diff: Diff, entities: Query): void {
  const componentNames = new Map(ComponentRegistry.instance.components.map((c) => [c.name, c]))

  // added components
  for (const [_, components] of Object.entries(diff.added)) {
    // let entity = binarySearchForId(Block, id, entities.current)
    // if (entity) {
    //   console.warn(`Entity with id ${id} already exists, skipping addition of components.`)
    //   continue
    // }

    // if (!entity) {
    //   entity = system.createEntity(Block, { id })
    // }

    const entity = system.createEntity(Persistent)
    for (const [componentName, model] of Object.entries(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      entity.add(Component, model)
    }
  }

  // changed components
  for (const [id, components] of Object.entries(diff.changedTo)) {
    const entity = binarySearchForId(Block, id, entities.current)
    if (!entity) continue

    for (const [componentName, model] of Object.entries(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      const writableComponent = entity.write(Component)
      writableComponent.deserialize(model)
    }
  }

  // removed components
  for (const [id, components] of Object.entries(diff.removed)) {
    const entity = binarySearchForId(Block, id, entities.current)
    if (!entity) continue

    for (const componentName of Object.keys(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      entity.remove(Component)
    }

    // If the entity has no components left, delete it
    const count = entity.countHas(...ComponentRegistry.instance.components)
    if (count === 0) {
      entity.delete()
    }
  }
}
