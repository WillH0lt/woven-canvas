import { comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import { LexoRank } from 'lexorank'

export function intersectPoint(point: [number, number], blockEntities: readonly Entity[]): Entity | null {
  let intersect: Entity | null = null
  let maxRank: LexoRank = LexoRank.min()

  for (const blockEntity of blockEntities) {
    const block = blockEntity.read(comps.Block)
    if (
      point[0] >= block.left &&
      point[0] <= block.left + block.width &&
      point[1] >= block.top &&
      point[1] <= block.top + block.height
    ) {
      const rank = LexoRank.parse(blockEntity.read(comps.ZIndex).rank)
      if (!intersect || rank.compareTo(maxRank) > 0) {
        intersect = blockEntity
        maxRank = rank
      }
    }
  }

  return intersect
}
