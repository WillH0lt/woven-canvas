import { comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export function intersectPoint(point: [number, number], blockEntities: readonly Entity[]): Entity | null {
  for (const blockEntity of blockEntities) {
    const block = blockEntity.read(comps.Block)
    if (
      point[0] >= block.left &&
      point[0] <= block.left + block.width &&
      point[1] >= block.top &&
      point[1] <= block.top + block.height
    ) {
      return blockEntity
    }
  }
  return null
}
