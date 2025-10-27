import type { BaseComponent } from '../BaseComponent'
import type { Snapshot } from '../History'
import { Block } from '../components'

export function createSnapshot(block: Block, components: BaseComponent[]): Snapshot {
  if (!block.id) {
    block.id = crypto.randomUUID()
  }

  console.log('Creating snapshot for block:', Block.constructor.name)

  const snapshot: Snapshot = {
    [block.id]: {
      Block: block.toJson(),
    },
  }

  for (const component of components) {
    const componentName = component.constructor.name
    snapshot[block.id][componentName] = component.toJson()
  }

  console.log('Snapshot created:', snapshot)

  return snapshot
}
