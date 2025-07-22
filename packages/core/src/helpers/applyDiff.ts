import type { Query, System } from '@lastolivegames/becsy'
import type { Diff } from '../History'
import { Registry } from '../Registry'
import { Persistent } from '../components'
import { binarySearchForId } from '../helpers/binarySearchForId'

export function applyDiff(system: System, diff: Diff, entities: Query): void {
  const componentNames = new Map(Registry.instance.historyComponents.map((c) => [c.name, c]))

  // added components
  for (const [id, components] of Object.entries(diff.added)) {
    let entity = binarySearchForId(Persistent, id, entities.current)
    if (!entity) {
      entity = system.createEntity(Persistent, { id })
    }

    for (const [componentName, model] of Object.entries(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      entity.add(Component, model)
    }
  }

  // changed components
  for (const [id, components] of Object.entries(diff.changedTo)) {
    const entity = binarySearchForId(Persistent, id, entities.current)
    if (!entity) continue

    for (const [componentName, model] of Object.entries(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      const writableComponent = entity.write(Component)
      writableComponent.fromModel(model)
    }
  }

  // removed components
  for (const [id, components] of Object.entries(diff.removed)) {
    const entity = binarySearchForId(Persistent, id, entities.current)
    if (!entity) continue

    for (const componentName of Object.keys(components)) {
      const Component = componentNames.get(componentName)
      if (!Component) continue
      entity.remove(Component)
    }

    // If the entity has no components left, delete it
    const count = entity.countHas(...Registry.instance.historyComponents)
    if (count === 0) {
      entity.delete()
    }
  }
}
