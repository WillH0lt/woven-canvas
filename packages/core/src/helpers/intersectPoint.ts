import type { Entity } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'

import { Aabb, Block, HitGeometries } from '../components'

export function intersectPoint(point: [number, number], blockEntities: readonly Entity[]): Entity[] {
  const intersects: Entity[] = []

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
      if (!hitGeometries.intersectsPoint(point)) {
        continue
      }
    }

    intersects.push(blockEntity)
  }

  // Sort intersections by rank
  return intersects.sort((a, b) => {
    const rankA = LexoRank.parse(a.read(Block).rank)
    const rankB = LexoRank.parse(b.read(Block).rank)
    return rankB.compareTo(rankA)
  })
}
