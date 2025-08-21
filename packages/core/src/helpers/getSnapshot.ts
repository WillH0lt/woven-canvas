import type { BaseComponent } from '../BaseComponent'
import type { Snapshot } from '../History'
import type { Block } from '../components'

export function getSnapshot(block: Block, components: BaseComponent[]): Snapshot {
  if (!block.id) {
    block.id = crypto.randomUUID()
  }

  const snapshot: Snapshot = {
    [block.id]: {
      Block: block.toJson(),
    },
  }

  for (const component of components) {
    const componentName = component.constructor.name
    snapshot[block.id][componentName] = component.toJson()
  }

  return snapshot
}
