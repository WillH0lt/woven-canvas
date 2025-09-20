import { Block, type HitArc, HitGeometries } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'

export function arcIntersectEntity(arc: HitArc, entity: Entity): [number, number][] {
  // If the entity has HitGeometries, ignore the block geometry for now...
  if (entity.has(HitGeometries)) {
    return []
  }

  // Check intersection with the block geometry
  const block = entity.read(Block)
  return arc.intersectBlock(block)
}
