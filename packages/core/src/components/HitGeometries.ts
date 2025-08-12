import { type Entity, component, field } from '@lastolivegames/becsy'

import type { Aabb } from './Aabb'
import { HitCapsule } from './HitCapsule'

@component
export class HitGeometries {
  @field.backrefs(HitCapsule, 'blockEntity', true) public declare capsules: Entity[]

  public intersectPoint(point: [number, number]): boolean {
    for (const capsuleEntity of this.capsules) {
      const capsule = capsuleEntity.read(HitCapsule)
      if (capsule.intersectsPoint(point)) {
        return true
      }
    }
    return false
  }

  public intersectAabb(aabb: Aabb): boolean {
    for (const capsuleEntity of this.capsules) {
      const capsule = capsuleEntity.read(HitCapsule)
      if (capsule.intersectsAabb(aabb)) {
        return true
      }
    }
    return false
  }
}
