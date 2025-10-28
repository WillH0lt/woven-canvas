import type { Entity, Query, System } from '@lastolivegames/becsy'

import { ComponentRegistry } from '../ComponentRegistry'
import type { Diff } from '../History'
import { Block, Persistent } from '../components'
import { binarySearchForId } from '../helpers/binarySearchForId'

export function applyDiff(system: System, diff: Diff, entities: Query): { added: Entity[]; changed: Entity[] } {
  const componentNames = ComponentRegistry.instance.componentNamesMap

  const added: Entity[] = []
  const changed: Entity[] = []

  // added components
  for (const [_, components] of Object.entries(diff.added)) {
    const entity = system.createEntity(Persistent)
    for (const [componentName, model] of Object.entries(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue

      entity.add(Component)
      const writableComponent = entity.write(Component)
      writableComponent.fromJson(model)
    }
    added.push(entity)
  }

  // changed components
  for (const [id, components] of Object.entries(diff.changedTo)) {
    const entity = binarySearchForId(Block, id, entities.current)
    if (!entity) continue

    for (const [componentName, model] of Object.entries(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      const writableComponent = entity.write(Component)
      writableComponent.fromJson(model)
    }
    changed.push(entity)
  }

  // removed components
  const current = [...entities.current]
  for (const [id, components] of Object.entries(diff.removed)) {
    const entity = binarySearchForId(Block, id, current)
    if (!entity) continue

    for (const componentName of Object.keys(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      entity.remove(Component)

      // When removing block remove the entity from the current list.
      // Otherwise doing subsequent binarySearchForId will cause problems
      if (Component === Block) {
        current.splice(current.indexOf(entity), 1)
      }
    }

    // If the entity has no components left, delete it
    const count = entity.countHas(...ComponentRegistry.instance.components)
    if (count === 0) {
      entity.delete()
    }
  }

  return { added, changed }
}
