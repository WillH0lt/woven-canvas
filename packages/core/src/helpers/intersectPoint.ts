import type { Entity } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'

import { Aabb, Block, HitGeometries } from '../components'

export function intersectPoint(point: [number, number], blockEntities: readonly Entity[]): Entity | undefined {
  let intersect: Entity | undefined = undefined
  let maxRank: LexoRank = LexoRank.min()

  for (const blockEntity of blockEntities) {
    const aabb = blockEntity.read(Aabb)

    if (!aabb.containsPoint(point)) {
      continue
    }

    const block = blockEntity.read(Block)
    if (!block.intersectsPoint(point)) {
      continue
    }

    if (blockEntity.has(HitGeometries)) {
      const hitGeometries = blockEntity.read(HitGeometries)
      if (!hitGeometries.intersectPoint(point)) {
        continue
      }
    }

    // If we have an intersection, check if it has a higher rank
    const rank = LexoRank.parse(blockEntity.read(Block).rank)
    if (!intersect || rank.compareTo(maxRank) > 0) {
      intersect = blockEntity
      maxRank = rank
    }
  }

  return intersect
}
