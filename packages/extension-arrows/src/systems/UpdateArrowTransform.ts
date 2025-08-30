import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import { Arrow, ArrowHandle } from '../components'
import { TRANSFORM_HANDLE_RANK, TRANSFORM_HANDLE_SIZE } from '../constants'
import { Arc } from '../helpers'
import { ArrowCommand, type ArrowCommandArgs, ArrowHandleKind } from '../types'
import { UpdateArrowDraw } from './UpdateArrowDraw'

function polarDelta(
  start: [number, number],
  end: [number, number],
  origin: [number, number],
): { angle: number; distance: number } {
  const startVec: [number, number] = [start[0] - origin[0], start[1] - origin[1]]
  const endVec: [number, number] = [end[0] - origin[0], end[1] - origin[1]]

  const startAngle = Math.atan2(startVec[1], startVec[0])
  const endAngle = Math.atan2(endVec[1], endVec[0])
  let angle = endAngle - startAngle
  if (angle > Math.PI) angle -= 2 * Math.PI
  if (angle < -Math.PI) angle += 2 * Math.PI

  const startDistance = Math.hypot(startVec[0], startVec[1])
  const endDistance = Math.hypot(endVec[0], endVec[1])
  const distance = endDistance - startDistance

  return { angle, distance }
}

function applyPolarDelta(
  position: [number, number],
  angle: number,
  distance: number,
  origin: [number, number],
): [number, number] {
  const newAngle = Math.atan2(position[1] - origin[1], position[0] - origin[0]) + angle
  const newDistance = Math.hypot(position[0] - origin[0], position[1] - origin[1]) + distance
  return [origin[0] + Math.cos(newAngle) * newDistance, origin[1] + Math.sin(newAngle) * newDistance]
}

export class UpdateArrowTransform extends BaseSystem<ArrowCommandArgs & CoreCommandArgs> {
  // private readonly selectedBlocks = this.query(
  //   (q) => q.added.removed.current.with(comps.Block, comps.Selected).write.using(comps.Aabb).read,
  // )

  // private readonly editedBlocks = this.query((q) => q.current.with(comps.Block, comps.Edited).write)

  private readonly arrows = this.query((q) => q.current.with(Arrow).write)

  private readonly handles = this.query(
    (q) => q.current.changed.with(ArrowHandle).write.and.with(comps.Block).write.trackWrites.using(comps.Opacity).write,
  )

  // private readonly blocks = this.query((q) =>
  //   q.current.with(comps.Block).write.orderBy((e) => uuidToNumber(e.read(comps.Block).id)),
  // )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateArrowDraw))
  }

  public initialize(): void {
    // this.addCommandListener(ArrowCommand.DragBlock, this.dragBlock.bind(this))
    this.addCommandListener(ArrowCommand.AddTransformHandles, this.addTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.UpdateTransformHandles, this.updateTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.HideTransformHandles, this.hideTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.ShowTransformHandles, this.showTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.RemoveTransformHandles, this.removeTransformHandles.bind(this))
    // this.addCommandListener(ArrowCommand.StartTransformHandlesEdit, this.startTransformHandlesEdit.bind(this))
    // this.addCommandListener(ArrowCommand.EndTransformHandlesEdit, this.endTransformHandlesEdit.bind(this))
    this.addCommandListener(CoreCommand.SetZoom, this.onZoom.bind(this))
  }

  public execute(): void {
    for (const handleEntity of this.handles.changed) {
      this.onHandleMove(handleEntity)
    }

    this.executeCommands()
  }

  private removeTransformHandles(): void {
    if (this.handles.current.length === 0) {
      console.warn('No transform handles to remove')
      return
    }

    this.deleteEntities(this.handles.current)

    // const isEditing = this.selectedBlocks.current.every((e) => e.has(comps.Edited))
    // if (isEditing) {
    //   this.endTransformHandlesEdit()
    // }
  }

  private addTransformHandles(arrowEntity: Entity): void {
    const handleKinds = [ArrowHandleKind.Start, ArrowHandleKind.Middle, ArrowHandleKind.End]

    const handles = handleKinds.map((handleKind) =>
      this.createEntity(
        ArrowHandle,
        {
          kind: handleKind,
          arrowEntity,
        },
        comps.Block,
        { id: crypto.randomUUID(), tag: 'ic-arrow-transform-handle', rank: TRANSFORM_HANDLE_RANK },
      ),
    )

    this.updateTransformHandles(arrowEntity, handles)
  }

  private updateTransformHandles(arrowEntity: Entity, handles: readonly Entity[] = this.handles.current): void {
    const arrowBlock = arrowEntity.read(comps.Block)
    const arrow = arrowEntity.read(Arrow)
    const handleSize = TRANSFORM_HANDLE_SIZE / this.camera.zoom

    for (const handleEntity of handles) {
      const handle = handleEntity.read(ArrowHandle)
      let uv: [number, number]

      switch (handle.kind) {
        case ArrowHandleKind.Start:
          uv = arrow.a
          break
        case ArrowHandleKind.Middle:
          uv = arrow.b
          break
        case ArrowHandleKind.End:
          uv = arrow.c
          break
      }

      const [x, y] = arrowBlock.uvToWorld(uv)

      const handleBlock = handleEntity.write(comps.Block)
      handleBlock.left = x - handleSize / 2
      handleBlock.top = y - handleSize / 2
      handleBlock.width = handleSize
      handleBlock.height = handleSize
    }
  }

  private hideTransformHandles(): void {
    for (const handleEntity of this.handles.current) {
      this.setComponent(handleEntity, comps.Opacity, { value: 0 })
    }
  }

  private showTransformHandles(): void {
    for (const handleEntity of this.handles.current) {
      this.unsetComponent(handleEntity, comps.Opacity)
    }

    if (this.handles.current.length > 0) {
      const arrow = this.handles.current[0].read(ArrowHandle).arrowEntity
      if (!arrow) return
      this.updateTransformHandles(arrow)
    }
  }

  private onHandleMove(handleEntity: Entity): void {
    const handle = handleEntity.read(ArrowHandle)
    const handleBlock = handleEntity.read(comps.Block)
    const handlePosition = handleBlock.getCenter()

    const arrowEntity = handle.arrowEntity
    if (!arrowEntity) return
    const arrow = arrowEntity.write(Arrow)
    const arrowBlock = arrowEntity.write(comps.Block)

    let aWorld = arrowBlock.uvToWorld(arrow.a)
    let bWorld = arrowBlock.uvToWorld(arrow.b)
    let cWorld = arrowBlock.uvToWorld(arrow.c)

    let start: [number, number] = [0, 0]
    let origin: [number, number] = [0, 0]
    if (handle.kind === ArrowHandleKind.Start) {
      start = aWorld
      origin = cWorld
      aWorld = handlePosition
    } else if (handle.kind === ArrowHandleKind.Middle) {
      bWorld = handlePosition
    } else {
      start = cWorld
      origin = aWorld
      cWorld = handlePosition
    }

    // b turns around the origin same amount as the dragged handle
    if (handle.kind !== ArrowHandleKind.Middle) {
      const { angle, distance } = polarDelta(start, handlePosition, origin)
      bWorld = applyPolarDelta(bWorld, angle, 0.5 * distance, origin)
    }

    // update the block bounds and make sure b is centered
    if (arrow.isCurved() || handle.kind === ArrowHandleKind.Middle) {
      const arc = new Arc(aWorld, bWorld, cWorld)
      const extrema = arc.getExtremaPoints(arrowBlock.rotateZ)
      arrowBlock.boundPoints(extrema)

      // Compute the middle point along the arc and convert to UV coordinates
      bWorld = arc.getPointAlongArc(0.5)
    } else {
      arrowBlock.boundPoints([aWorld, cWorld])

      // bWorld should always be centered between a and c
      bWorld = [(aWorld[0] + cWorld[0]) / 2, (aWorld[1] + cWorld[1]) / 2]
    }

    // update the arrow's 3 uv coordinates
    arrow.a = arrowBlock.worldToUv(aWorld)
    arrow.b = arrowBlock.worldToUv(bWorld)
    arrow.c = arrowBlock.worldToUv(cWorld)
  }

  // private startTransformBoxEdit(transformBoxEntity: Entity | undefined = undefined): void {
  //   if (transformBoxEntity === undefined) {
  //     if (this.transformBoxes.current.length === 0) {
  //       console.warn('No transform box to edit')
  //       return
  //     }

  //     transformBoxEntity = this.transformBoxes.current[0]

  //     if (!transformBoxEntity) {
  //       console.warn('No transform box found to edit')
  //       return
  //     }
  //   }

  //   this.setComponent(transformBoxEntity, Locked)

  //   const selectedBlocks = this.selectedBlocks.current.filter(
  //     (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
  //   )

  //   for (const blockEntity of selectedBlocks) {
  //     this.setComponent(blockEntity, comps.Edited)
  //   }
  // }

  // private endTransformBoxEdit(): void {
  //   if (this.transformBoxes.current.length === 0) {
  //     console.warn('No transform box to end edit')
  //     return
  //   }
  //   const transformBoxEntity = this.transformBoxes.current[0]

  //   if (!transformBoxEntity) {
  //     console.warn('No transform box found to end edit')
  //     return
  //   }

  //   if (transformBoxEntity.has(Locked)) {
  //     transformBoxEntity.remove(Locked)
  //   }

  //   for (const blockEntity of this.editedBlocks.current) {
  //     if (blockEntity.has(comps.Edited)) {
  //       blockEntity.remove(comps.Edited)
  //     }
  //   }
  // }

  public onZoom(): void {
    if (!this.handles.current.length) return
    const arrow = this.arrows.current[0]
    this.updateTransformHandles(arrow)
  }
}
