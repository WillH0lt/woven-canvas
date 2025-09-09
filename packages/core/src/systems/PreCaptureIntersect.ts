import type { Entity } from '@lastolivegames/becsy'
import { BaseSystem } from '../BaseSystem'
import { Aabb, Block, Camera, Hovered, Intersect, Persistent, allHitGeometriesArray } from '../components'
import { computeAabb, intersectPoint } from '../helpers'

export class PreCaptureIntersect extends BaseSystem {
  private readonly intersects = this.query((q) => q.current.with(Intersect).write)

  private readonly cameras = this.query((q) => q.changed.with(Camera).trackWrites)

  private readonly blocks = this.query(
    (q) =>
      q.addedOrChanged.changed.removed.current
        .with(Block)
        .trackWrites.using(Aabb)
        .write.using(...allHitGeometriesArray).read,
  )

  private readonly hovered = this.query((q) => q.current.with(Hovered).write.using(Persistent).read)

  public execute(): void {
    // update aabb
    for (const blockEntity of this.blocks.addedOrChanged) {
      const aabb = computeAabb(blockEntity)

      if (!blockEntity.has(Aabb)) {
        blockEntity.add(Aabb)
      }

      Object.assign(blockEntity.write(Aabb), aabb)
    }

    // update intersected entity
    if (this.mouse.moveTrigger || this.blocks.addedOrChanged.length > 0 || this.cameras.changed.length > 0) {
      const point = this.camera.toWorld(this.mouse.position)
      const intersected: (Entity | undefined)[] = intersectPoint(point, this.blocks.current)

      // make intersected 5 entries, if it's less make the extra undefined
      while (intersected.length < 5) {
        intersected.push(undefined)
      }

      if (this.intersectedHasChanged(intersected)) {
        const writeableIntersect = this.intersects.current[0].write(Intersect)
        writeableIntersect.entity = intersected[0]
        writeableIntersect.entity2 = intersected[1]
        writeableIntersect.entity3 = intersected[2]
        writeableIntersect.entity4 = intersected[3]
        writeableIntersect.entity5 = intersected[4]

        // don't let the hovered entity change when pointer is down
        // this is mostly useful when dragging objects so the hover state doesn't flicker
        if (this.pointers.current.length === 0) {
          this.setHoveredEntity(intersected[0])
        }
      }
    }

    if (this.mouse.leaveTrigger) {
      const intersect = this.intersects.current[0].write(Intersect)
      intersect.entity = undefined
      this.setHoveredEntity(undefined)
    }
  }

  private intersectedHasChanged(newIntersected: (Entity | undefined)[]): boolean {
    const hasChanged = (currEntity: Entity | undefined, newEntity: Entity | undefined) =>
      !!(
        (!currEntity && newEntity) ||
        (currEntity && !newEntity) ||
        (currEntity && newEntity && !currEntity.isSame(newEntity))
      )

    const changed =
      hasChanged(this.intersect.entity, newIntersected[0]) ||
      hasChanged(this.intersect.entity2, newIntersected[1]) ||
      hasChanged(this.intersect.entity3, newIntersected[2]) ||
      hasChanged(this.intersect.entity4, newIntersected[3]) ||
      hasChanged(this.intersect.entity5, newIntersected[4])

    return changed
  }

  private setHoveredEntity(entity: Entity | undefined): void {
    for (const hovered of this.hovered.current) {
      if (hovered.has(Hovered)) hovered.remove(Hovered)
    }
    if (entity && this.controls.leftMouseTool === 'select') {
      if (!entity.has(Hovered)) entity.add(Hovered)
    }
  }
}
