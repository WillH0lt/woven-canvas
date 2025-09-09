import { type Entity, component, field } from '@lastolivegames/becsy'

import type { Aabb } from './Aabb'
import { HitArc } from './HitArc'
import { HitCapsule } from './HitCapsule'

@component
export class HitGeometries {
  @field.backrefs(HitCapsule, 'blockEntity') public declare capsules: Entity[]
  @field.backrefs(HitArc, 'blockEntity') public declare arcs: Entity[]

  public intersectsPoint(point: [number, number]): boolean {
    for (const capsuleEntity of this.capsules) {
      const capsule = capsuleEntity.read(HitCapsule)
      if (capsule.intersectsPoint(point)) {
        return true
      }
    }

    for (const arcEntity of this.arcs) {
      const arc = arcEntity.read(HitArc)
      if (arc.intersectsPoint(point)) {
        return true
      }
    }
    return false
  }

  public intersectsAabb(aabb: Aabb): boolean {
    for (const capsuleEntity of this.capsules) {
      const capsule = capsuleEntity.read(HitCapsule)
      if (capsule.intersectsAabb(aabb)) {
        return true
      }
    }

    for (const arcEntity of this.arcs) {
      const arc = arcEntity.read(HitArc)
      if (arc.intersectsAabb(aabb)) {
        return true
      }
    }

    return false
  }

  public intersectsCapsule(capsule: HitCapsule): boolean {
    for (const capsuleEntity of this.capsules) {
      const otherCapsule = capsuleEntity.read(HitCapsule)
      if (otherCapsule.intersectsCapsule(capsule)) {
        return true
      }
    }

    for (const arcEntity of this.arcs) {
      const arc = arcEntity.read(HitArc)
      if (arc.intersectsCapsule(capsule)) {
        return true
      }
    }

    return false
  }
}
