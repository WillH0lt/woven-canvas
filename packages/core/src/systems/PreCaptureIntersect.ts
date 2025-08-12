import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { computeAabb, intersectPoint } from '../helpers'

export class PreCaptureIntersect extends BaseSystem {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly intersects = this.query((q) => q.current.with(comps.Intersect).write)

  private get intersect(): comps.Intersect {
    return this.intersects.current[0].write(comps.Intersect)
  }

  // declaring to becsy that intersect is a singleton component
  private readonly _intersect = this.singleton.read(comps.Intersect)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly blocks = this.query(
    (q) =>
      q.addedOrChanged.changed.removed.current
        .with(comps.Block)
        .trackWrites.using(comps.Aabb)
        .write.using(comps.HitGeometries, comps.HitCapsule).read,
  )

  public execute(): void {
    for (const blockEntity of this.blocks.addedOrChanged) {
      const aabb = computeAabb(blockEntity)

      if (!blockEntity.has(comps.Aabb)) {
        blockEntity.add(comps.Aabb)
      }

      Object.assign(blockEntity.write(comps.Aabb), aabb)
    }

    if (this.mouse.moveTrigger || this.blocks.addedOrChanged.length > 0) {
      const point = this.camera.toWorld(this.mouse.position)
      this.intersect.entity = intersectPoint(point, this.blocks.current)
    }
  }
}
