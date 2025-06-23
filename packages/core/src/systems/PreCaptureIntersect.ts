import { System } from '@lastolivegames/becsy'

import * as comps from '../components'
import { computeAabb, intersectPoint } from '../helpers'

export class PreCaptureIntersect extends System {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly intersects = this.query((q) => q.current.with(comps.Intersect).write)

  private get intersect(): comps.Intersect {
    return this.intersects.current[0].write(comps.Intersect)
  }

  // declaring to becsy that intersect is a singleton component
  private readonly _intersect = this.singleton.read(comps.Intersect)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly draggableBlocks = this.query(
    (q) =>
      q.addedOrChanged.changed.removed.current
        .with(comps.Block, comps.Draggable, comps.ZIndex)
        .trackWrites.using(comps.Aabb).write,
  )

  public execute(): void {
    for (const blockEntity of this.draggableBlocks.addedOrChanged) {
      const aabb = computeAabb(blockEntity)
      if (blockEntity.has(comps.Aabb)) {
        Object.assign(blockEntity.write(comps.Aabb), aabb)
      } else {
        blockEntity.add(comps.Aabb, aabb)
      }
    }

    // if (this.pointer.moveTrigger || this.pointer.downPosition || this.pointer.upTrigger) {
    if (this.mouse.moveTrigger) {
      const point = this.camera.toWorld(this.mouse.position)
      this.intersect.entity = intersectPoint(point, this.draggableBlocks.current)
    }
  }
}
