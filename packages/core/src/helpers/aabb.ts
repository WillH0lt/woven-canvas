import type { Entity } from '@lastolivegames/becsy'
import { Aabb, Block, HitArc, HitCapsule, HitGeometries } from '../components'

export function computeAabb(blockEntity: Readonly<Entity>): Aabb {
  const block = blockEntity.read(Block)
  let aabb: Aabb

  if (blockEntity.has(HitGeometries)) {
    aabb = new Aabb()
    const hitGeometries = blockEntity.read(HitGeometries)
    const pts: [number, number][] = []
    for (const capsuleEntity of hitGeometries.capsules) {
      const capsule = capsuleEntity.read(HitCapsule)
      const r = capsule.radius

      for (const pt of [capsule.a, capsule.b]) {
        pts.push([pt[0] - r, pt[1] - r])
        pts.push([pt[0] - r, pt[1] + r])
        pts.push([pt[0] + r, pt[1] - r])
        pts.push([pt[0] + r, pt[1] + r])
      }
    }

    for (const arcEntity of hitGeometries.arcs) {
      const arc = arcEntity.read(HitArc)
      const extrema = arc.getExtremaPoints(block.rotateZ)
      const r = arc.thickness / 2
      for (const pt of extrema) {
        pts.push([pt[0] - r, pt[1] - r])
        pts.push([pt[0] - r, pt[1] + r])
        pts.push([pt[0] + r, pt[1] - r])
        pts.push([pt[0] + r, pt[1] + r])
      }
    }

    aabb.setByPoints(pts)
  } else {
    const corners = block.getCorners()
    aabb = new Aabb().setByPoints(corners)
  }

  return aabb
}
