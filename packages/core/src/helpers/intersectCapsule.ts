import type { Entity } from '@lastolivegames/becsy'

import { Aabb, Block, type HitCapsule, HitGeometries } from '../components'

export function intersectCapsule(capsule: HitCapsule, blockEntities: readonly Entity[]): Entity[] {
  const intersects: Entity[] = []

  for (const blockEntity of blockEntities) {
    const aabb = blockEntity.read(Aabb)
    if (!capsule.intersectsAabb(aabb)) {
      continue
    }

    const block = blockEntity.read(Block)
    if (!capsule.intersectsBlock(block)) {
      continue
    }

    if (blockEntity.has(HitGeometries)) {
      const hitGeometries = blockEntity.read(HitGeometries)
      if (!hitGeometries.intersectsCapsule(capsule)) {
        continue
      }
    }

    intersects.push(blockEntity)
  }

  return intersects
}
