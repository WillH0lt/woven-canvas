import { System } from '@lastolivegames/becsy'

import * as comps from '../components'
import { computeAabb, intersectPoint } from '../helpers'

export class PreCaptureIntersect extends System {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly intersect = this.singleton.write(comps.Intersect)

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

    if (this.pointer.moveTrigger || this.pointer.downPosition || this.pointer.upTrigger) {
      this.intersect.entity = intersectPoint(this.pointer.position, this.draggableBlocks.current)
    }
  }
}
