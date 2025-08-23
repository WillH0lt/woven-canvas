import type { Entity } from '@lastolivegames/becsy'
import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { computeAabb, intersectPoint } from '../helpers'

export class PreCaptureIntersect extends BaseSystem {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly intersects = this.query((q) => q.current.with(comps.Intersect).write)

  private readonly pointers = this.query((q) => q.added.current.changed.removed.with(comps.Pointer).read.trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly controls = this.singleton.read(comps.Controls)

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly blocks = this.query(
    (q) =>
      q.addedOrChanged.changed.removed.current
        .with(comps.Block)
        .trackWrites.using(comps.Aabb)
        .write.using(comps.HitGeometries, comps.HitCapsule).read,
  )

  private readonly hovered = this.query((q) => q.current.with(comps.Hovered).write.using(comps.Persistent).read)

  public execute(): void {
    // update aabb
    for (const blockEntity of this.blocks.addedOrChanged) {
      const aabb = computeAabb(blockEntity)

      if (!blockEntity.has(comps.Aabb)) {
        blockEntity.add(comps.Aabb)
      }

      Object.assign(blockEntity.write(comps.Aabb), aabb)
    }

    // don't let the hovered entity change when pointer is down
    // this is mostly useful when dragging objects so the hover state doesn't flicker
    if (this.pointers.current.length) return

    // update intersected entity
    if (this.mouse.moveTrigger || this.blocks.addedOrChanged.length > 0 || this.cameras.changed.length > 0) {
      const point = this.camera.toWorld(this.mouse.position)
      const intersectedEntity = intersectPoint(point, this.blocks.current)
      if (this.intersectedHasChanged(intersectedEntity)) {
        const writeableIntersect = this.intersects.current[0].write(comps.Intersect)
        writeableIntersect.entity = intersectedEntity

        this.setHoveredEntity(intersectedEntity)
      }
    }

    if (this.mouse.leaveTrigger) {
      const intersect = this.intersects.current[0].write(comps.Intersect)
      intersect.entity = undefined
      this.setHoveredEntity(undefined)
    }
  }

  private intersectedHasChanged(newIntersected: Entity | undefined): boolean {
    let currIntersect = null
    if (this.intersects.current.length > 0) {
      currIntersect = this.intersects.current[0].read(comps.Intersect).entity
    }

    return !!(
      (!currIntersect && newIntersected) ||
      (currIntersect && !newIntersected) ||
      (currIntersect && newIntersected && !currIntersect.isSame(newIntersected))
    )
  }

  private setHoveredEntity(entity: Entity | undefined): void {
    for (const hovered of this.hovered.current) {
      if (hovered.has(comps.Hovered)) hovered.remove(comps.Hovered)
    }
    // entity?.has(comps.Persistent) &&
    if (entity && this.controls.leftMouseTool === 'select') {
      if (!entity.has(comps.Hovered)) entity.add(comps.Hovered)
    }
  }
}
