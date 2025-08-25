import { type Entity, component, field } from '@lastolivegames/becsy'

import type { Aabb } from './Aabb'
import { HitCapsule } from './HitCapsule'

@component
export class HitGeometries {
  @field.backrefs(HitCapsule, 'blockEntity', true) public declare capsules: Entity[]

  public intersectsPoint(point: [number, number]): boolean {
    for (const capsuleEntity of this.capsules) {
      const capsule = capsuleEntity.read(HitCapsule)
      if (capsule.intersectsPoint(point)) {
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
    return false
  }

  public intersectsCapsule(capsule: HitCapsule): boolean {
    for (const capsuleEntity of this.capsules) {
      const otherCapsule = capsuleEntity.read(HitCapsule)
      if (otherCapsule.intersectsCapsule(capsule)) {
        return true
      }
    }
    return false
  }
}
