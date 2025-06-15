import { comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export function intersectBlock(block: comps.Block, blockEntities: readonly Entity[]): Entity[] {
  const entities: Entity[] = []

  for (const blockEntity of blockEntities) {
    const b = blockEntity.read(comps.Block)
    if (
      block.left < b.left + b.width &&
      block.left + block.width > b.left &&
      block.top < b.top + b.height &&
      block.top + block.height > b.top
    ) {
      entities.push(blockEntity)
    }
  }
  return entities
}
