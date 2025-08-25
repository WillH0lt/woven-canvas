import { Aabb, Block, HitGeometries } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'

export function intersectAabb(aabb: Aabb, blockEntities: readonly Entity[]): Entity[] {
  const intersecting: Entity[] = []

  for (const blockEntity of blockEntities) {
    const entityAabb = blockEntity.read(Aabb)

    // Quick AABB intersection check first
    if (!aabb.intersectsAabb(entityAabb)) {
      continue
    }

    // Now check if the AABB actually intersects with the oriented block
    if (aabb.surroundsAabb(entityAabb)) {
      intersecting.push(blockEntity)
      continue
    }

    const block = blockEntity.read(Block)
    if (!block.intersectsAabb(aabb)) {
      continue
    }

    if (blockEntity.has(HitGeometries)) {
      const hitGeometries = blockEntity.read(HitGeometries)
      if (!hitGeometries.intersectsAabb(aabb)) {
        continue
      }
    }

    intersecting.push(blockEntity)
  }

  return intersecting
}
