import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import {
  Block,
  Color,
  Connector,
  HitArc,
  HitCapsule,
  HitGeometries,
  Opacity,
  Persistent,
  RankBounds,
  Text,
  allHitGeometriesArray,
} from '@infinitecanvas/core/components'
import { intersectPoint } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'

import { Arrow, ArrowHandle, ArrowTrim } from '../components'
import { TRANSFORM_HANDLE_RANK, TRANSFORM_HANDLE_SIZE } from '../constants'
import { arcIntersectEntity, closestPointToPoint } from '../helpers'
import { ArrowCommand, type ArrowCommandArgs, ArrowHandleKind, ArrowHeadKind } from '../types'

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

  private readonly rankBounds = this.singleton.write(RankBounds)

  private readonly arrows = this.query(
    (q) =>
      q.current.addedOrChanged
        .with(Arrow, Block, Connector)
        .write.trackWrites.using(HitGeometries, HitArc, HitCapsule, Persistent, Color, Text, ArrowTrim)
        .write.using(...allHitGeometriesArray).read,
  )

  private readonly handles = this.query(
    (q) => q.current.changed.with(ArrowHandle).write.and.with(Block).write.trackWrites.using(Opacity).write,
  )

  private readonly blocks = this.query((q) => q.changed.and.current.with(Block).trackWrites)

  public initialize(): void {
    this.addCommandListener(ArrowCommand.AddArrow, this.addArrow.bind(this))
    this.addCommandListener(ArrowCommand.DrawArrow, this.drawArrow.bind(this))
    this.addCommandListener(ArrowCommand.RemoveArrow, this.removeArrow.bind(this))

    this.addCommandListener(ArrowCommand.AddTransformHandles, this.addTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.UpdateTransformHandles, this.updateTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.HideTransformHandles, this.hideTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.ShowTransformHandles, this.showTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.RemoveTransformHandles, this.removeTransformHandles.bind(this))
    // this.addCommandListener(ArrowCommand.StartTransformHandlesEdit, this.startTransformHandlesEdit.bind(this))
    // this.addCommandListener(ArrowCommand.EndTransformHandlesEdit, this.endTransformHandlesEdit.bind(this))
    this.addCommandListener(CoreCommand.DragBlock, this.onBlockDrag.bind(this))
    this.addCommandListener(CoreCommand.SetZoom, this.onZoom.bind(this))
  }

  public execute(): void {
    this.executeCommands()

    // when a block is moved recalculate the arrow endpoints
    for (const blockEntity of this.blocks.changed) {
      for (const connectorEntity of blockEntity.read(Block).connectors) {
        if (connectorEntity.has(Arrow)) {
          const block = blockEntity.read(Block)
          const connector = connectorEntity.read(Connector)
          const handleKind = connector.startBlockId === block.id ? ArrowHandleKind.Start : ArrowHandleKind.End
          const uv = handleKind === ArrowHandleKind.Start ? connector.startBlockUv : connector.endBlockUv
          const position = block.uvToWorld(uv)
          this.updateArrow(connectorEntity, handleKind, position)
        }
      }
    }

    // sync hit geometry
    for (const arrowEntity of this.arrows.addedOrChanged) {
      this.addOrUpdateHitGeometry(arrowEntity)
    }
  }

  private addArrow(arrowEntity: Entity, position: [number, number]): void {
    const thickness = 4

    const block = {
      tag: 'ic-arrow',
      id: crypto.randomUUID(),
      rank: this.rankBounds.genNext().toString(),
      left: position[0] - thickness / 2,
      top: position[1] - thickness / 2,
      width: thickness,
      height: thickness,
    }

    arrowEntity.add(Block, block)
    arrowEntity.add(Persistent)

    arrowEntity.add(Arrow, {
      a: [0, 0],
      b: [0.5, 0.5],
      c: [1, 1],
      thickness,
      startArrowHead: ArrowHeadKind.None,
      endArrowHead: ArrowHeadKind.V,
    })

    arrowEntity.add(Color)
    arrowEntity.add(Text)
    arrowEntity.add(Connector)

    this.updateConnector(arrowEntity, ArrowHandleKind.Start, position)
  }

  private drawArrow(arrowEntity: Entity, start: [number, number], end: [number, number]): void {
    const block = arrowEntity.write(Block)
    block.left = Math.min(start[0], end[0])
    block.top = Math.min(start[1], end[1])
    block.width = Math.abs(start[0] - end[0])
    block.height = Math.abs(start[1] - end[1])

    // arrow a and b are in uv coordinates
    const arrow = arrowEntity.write(Arrow)
    const ax = start[0] < end[0] ? 0 : 1
    const ay = start[1] < end[1] ? 0 : 1
    arrow.a = [ax, ay]
    arrow.b = [0.5, 0.5]
    arrow.c = [1 - ax, 1 - ay]

    this.updateConnector(arrowEntity, ArrowHandleKind.End, end)
  }

  private removeArrow(arrowEntity: Entity): void {
    this.deleteEntity(arrowEntity)
  }

  private removeTransformHandles(): void {
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
        },
        Block,
        { id: crypto.randomUUID(), tag: 'ic-arrow-transform-handle', rank: TRANSFORM_HANDLE_RANK },
      ),
    )

    this.updateTransformHandles(arrowEntity, handles)
  }

  private updateTransformHandles(arrowEntity: Entity, handles: readonly Entity[] = this.handles.current): void {
    const handleSize = TRANSFORM_HANDLE_SIZE / this.camera.zoom

    for (const handleEntity of handles) {
      const arrowBlock = arrowEntity.read(Block)
      const arrow = arrowEntity.read(Arrow)
      const handle = handleEntity.write(ArrowHandle)
      handle.arrowEntity = arrowEntity

      let position: [number, number]

      switch (handle.kind) {
        case ArrowHandleKind.Start:
          position = arrowBlock.uvToWorld(arrow.a)
          break
        case ArrowHandleKind.Middle:
          position = this.getTrimmedCenter(arrowEntity) ?? arrowBlock.uvToWorld(arrow.b)
          break
        case ArrowHandleKind.End:
          position = arrowBlock.uvToWorld(arrow.c)
          break
      }

      const handleBlock = handleEntity.write(Block)
      handleBlock.left = position[0] - handleSize / 2
      handleBlock.top = position[1] - handleSize / 2
      handleBlock.width = handleSize
      handleBlock.height = handleSize
    }
  }

  private getTrimmedCenter(arrowEntity: Entity): [number, number] | null {
    this.addOrUpdateHitGeometry(arrowEntity)

    const arrow = arrowEntity.read(Arrow)
    const hitGeometries = arrowEntity.read(HitGeometries)

    if (arrow.isCurved()) {
      const hitArcEntity = hitGeometries.arcs[0]
      if (!hitArcEntity) return null
      const hitArc = hitArcEntity.read(HitArc)
      return hitArc.parametricToPoint(0.5)
    }

    const hitCapsuleEntity = hitGeometries.capsules[0]
    if (!hitCapsuleEntity) return null
    const hitCapsule = hitCapsuleEntity.read(HitCapsule)
    return hitCapsule.parametricToPoint(0.5)
  }

  private hideTransformHandles(): void {
    for (const handleEntity of this.handles.current) {
      this.setComponent(handleEntity, Opacity, { value: 0 })
    }
  }

  private showTransformHandles(): void {
    for (const handleEntity of this.handles.current) {
      this.unsetComponent(handleEntity, Opacity)
    }

    if (this.handles.current.length > 0) {
      const arrow = this.handles.current[0].read(ArrowHandle).arrowEntity
      if (!arrow) return
      this.updateTransformHandles(arrow)
    }
  }

  private onBlockDrag(blockEntity: Entity): void {
    if (blockEntity.has(Arrow)) {
      this.onArrowDrag(blockEntity)
    } else if (blockEntity.has(ArrowHandle)) {
      this.onArrowHandleDrag(blockEntity)
    }
  }

  private onArrowDrag(arrowEntity: Entity): void {
    if (arrowEntity.read(Connector).startBlockEntity) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(Arrow)
      const start = block.uvToWorld(arrow.a)
      this.updateConnector(arrowEntity, ArrowHandleKind.Start, start)
    }

    if (arrowEntity.read(Connector).endBlockEntity) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(Arrow)
      const end = block.uvToWorld(arrow.c)
      this.updateConnector(arrowEntity, ArrowHandleKind.End, end)
    }
  }

  private onArrowHandleDrag(blockEntity: Entity): void {
    if (!blockEntity.has(ArrowHandle)) return

    const handle = blockEntity.read(ArrowHandle)
    const arrowEntity = handle.arrowEntity
    if (!arrowEntity) return

    const handleBlock = blockEntity.read(Block)
    const handlePosition = handleBlock.getCenter()

    this.updateArrow(arrowEntity, handle.kind, handlePosition)
    if (handle.kind !== ArrowHandleKind.Middle) {
      this.updateConnector(arrowEntity, handle.kind, handlePosition)
    }
  }

  private updateArrow(arrowEntity: Entity, handleKind: ArrowHandleKind, handlePosition: [number, number]): void {
    const arrow = arrowEntity.write(Arrow)
    const arrowBlock = arrowEntity.write(Block)

    let aWorld = arrowBlock.uvToWorld(arrow.a)
    let bWorld = arrowBlock.uvToWorld(arrow.b)
    let cWorld = arrowBlock.uvToWorld(arrow.c)

    let start: [number, number] = [0, 0]
    let origin: [number, number] = [0, 0]
    if (handleKind === ArrowHandleKind.Start) {
      start = aWorld
      origin = cWorld
      aWorld = handlePosition
    } else if (handleKind === ArrowHandleKind.Middle) {
      bWorld = handlePosition
    } else {
      start = cWorld
      origin = aWorld
      cWorld = handlePosition
    }

    // b turns around the origin same amount as the dragged handle
    if (handleKind !== ArrowHandleKind.Middle) {
      const { angle, distance } = polarDelta(start, handlePosition, origin)
      bWorld = applyPolarDelta(bWorld, angle, 0.5 * distance, origin)
    }

    // update the block bounds and make sure b is centered
    if (arrow.isCurved() || handleKind === ArrowHandleKind.Middle) {
      const arc = new HitArc()
      arc.update(aWorld, bWorld, cWorld)

      const extrema = arc.getExtremaPoints(arrowBlock.rotateZ)
      arrowBlock.boundPoints(extrema)

      // Compute the middle point along the arc and convert to UV coordinates
      bWorld = arc.parametricToPoint(0.5)

      if (arc._radius > (3_000 * arc.length()) / 1_000) {
        // make straight
        bWorld = [(aWorld[0] + cWorld[0]) / 2, (aWorld[1] + cWorld[1]) / 2]
      }

      arrow.b = arrowBlock.worldToUv(bWorld)
    } else {
      arrowBlock.boundPoints([aWorld, cWorld])

      // bWorld should always be centered between a and c
      bWorld = [(aWorld[0] + cWorld[0]) / 2, (aWorld[1] + cWorld[1]) / 2]
      arrow.b = arrowBlock.worldToUv(bWorld)
    }

    arrow.a = arrowBlock.worldToUv(aWorld)
    arrow.c = arrowBlock.worldToUv(cWorld)
  }

  private updateConnector(arrowEntity: Entity, handleKind: ArrowHandleKind, handlePosition: [number, number]): void {
    const attachment = this.getAttachmentBlock(handlePosition)
    const attachmentBlock = attachment?.read(Block)

    const connector = arrowEntity.write(Connector)

    if (handleKind === ArrowHandleKind.Start) {
      connector.startBlockId = attachmentBlock?.id ?? ''
      connector.startBlockUv = attachmentBlock?.worldToUv(handlePosition) ?? [0, 0]
      connector.startBlockEntity = attachment || undefined
    } else {
      connector.endBlockId = attachmentBlock?.id ?? ''
      connector.endBlockUv = attachmentBlock?.worldToUv(handlePosition) ?? [0, 0]
      connector.endBlockEntity = attachment || undefined
    }
  }

  private getAttachmentBlock(handlePosition: [number, number]): Entity | null {
    let intersects: Entity[]

    // const pointerPosition = this.getPointerPosition()

    // if (pointerPosition === null) return null

    // const dist = Math.hypot(handlePosition[0] - pointerPosition[0], handlePosition[1] - pointerPosition[1])
    // console.log(dist)
    // if (dist < 2) {
    //   // use the precalculated intersects from PreCaptureIntersect system
    //   intersects = this.intersect.getIntersectArray()
    //   console.log('USING PRECALCULATED INTERSECTS')
    // } else {
    // }
    intersects = intersectPoint(handlePosition, this.blocks.current)

    for (const intersect of intersects) {
      if (!intersect.has(ArrowHandle) && !intersect.has(Arrow)) {
        return intersect
      }
    }

    return null
  }

  private updateArrowTrim(arrowEntity: Entity): void {
    const connector = arrowEntity.read(Connector)
    const arrow = arrowEntity.read(Arrow)

    const arrowBlock = arrowEntity.read(Block)
    const aWorld = arrowBlock.uvToWorld(arrow.a)
    const cWorld = arrowBlock.uvToWorld(arrow.c)

    if (!arrowEntity.has(ArrowTrim)) {
      arrowEntity.add(ArrowTrim)
    }
    const trim = arrowEntity.write(ArrowTrim)

    const hitGeometries = arrowEntity.read(HitGeometries)
    const arc = hitGeometries.arcs.length > 0 ? hitGeometries.arcs[0].write(HitArc) : null
    const capsule = hitGeometries.capsules.length > 0 ? hitGeometries.capsules[0].write(HitCapsule) : null

    const startTrim = this.calculateTrim(connector.startBlockEntity, arc, capsule, aWorld, 0)
    const endTrim = this.calculateTrim(connector.endBlockEntity, arc, capsule, cWorld, 1)

    trim.tStart = startTrim
    trim.tEnd = endTrim

    // reset if the trim is too small
    if (endTrim - startTrim < 0.1) {
      trim.tStart = 0
      trim.tEnd = 1
    }

    // trim the hit geometry
    if (arc) {
      arc.trim(trim.tStart, trim.tEnd)
    } else if (capsule) {
      capsule.trim(trim.tStart, trim.tEnd)
    }
  }

  private calculateTrim(
    blockEntity: Entity | undefined,
    hitArc: Readonly<HitArc> | null,
    capsule: Readonly<HitCapsule> | null,
    referencePoint: [number, number],
    defaultValue: number,
  ): number {
    if (!blockEntity) return defaultValue

    const block = blockEntity.read(Block)
    let points: [number, number][] = []

    if (hitArc) {
      points = arcIntersectEntity(hitArc, blockEntity)
    } else if (capsule) {
      points = capsule.centerLineIntersectBlock(block)
    }

    const intersect = closestPointToPoint(points, referencePoint)
    if (!intersect) return defaultValue

    let t: number | null = null
    if (hitArc) {
      t = hitArc.pointToParametric(intersect)
    } else if (capsule) {
      t = capsule.pointToParametric(intersect)
    }

    return t ?? defaultValue
  }

  private addOrUpdateHitGeometry(arrowEntity: Entity): void {
    if (!arrowEntity.has(HitGeometries)) {
      arrowEntity.add(HitGeometries)
    }

    if (!arrowEntity.has(ArrowTrim)) {
      arrowEntity.add(ArrowTrim)
    }

    const hitGeometries = arrowEntity.read(HitGeometries)

    const arrow = arrowEntity.read(Arrow)
    const block = arrowEntity.read(Block)

    const minThickness = 20

    if (arrow.isCurved()) {
      for (const capsule of hitGeometries.capsules) {
        capsule.delete()
      }

      const a = block.uvToWorld(arrow.a)
      const b = block.uvToWorld(arrow.b)
      const c = block.uvToWorld(arrow.c)

      let arcEntity: Entity | undefined
      if (hitGeometries.arcs.length > 0) {
        arcEntity = hitGeometries.arcs[0]
      } else {
        arcEntity = this.createEntity(HitArc, { blockEntity: arrowEntity })
      }

      const hitArc = arcEntity.write(HitArc)
      hitArc.thickness = Math.max(arrow.thickness, minThickness)
      hitArc.update(a, b, c)
    } else {
      for (const arc of hitGeometries.arcs) {
        arc.delete()
      }

      const a = block.uvToWorld(arrow.a)
      const c = block.uvToWorld(arrow.c)

      let hitCapsuleEntity: Entity | undefined
      if (hitGeometries.capsules.length > 0) {
        hitCapsuleEntity = hitGeometries.capsules[0]
      } else {
        hitCapsuleEntity = this.createEntity(HitCapsule, { blockEntity: arrowEntity })
      }

      const hitCapsule = hitCapsuleEntity.write(HitCapsule)
      hitCapsule.radius = Math.max(arrow.thickness / 2, minThickness / 2)

      hitCapsule.a = a
      hitCapsule.b = c
    }

    this.updateArrowTrim(arrowEntity)
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
