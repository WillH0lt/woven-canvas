import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import {
  Block,
  Connector,
  HitArc,
  HitCapsule,
  HitGeometries,
  Opacity,
  Persistent,
  RankBounds,
  allHitGeometriesArray,
} from '@infinitecanvas/core/components'
import { Color } from '@infinitecanvas/extension-color'
import { Text } from '@infinitecanvas/extension-text'
import type { Entity } from '@lastolivegames/becsy'

import { Arrow, ArrowHandle, ArrowTrim } from '../components'
import { TRANSFORM_HANDLE_RANK, TRANSFORM_HANDLE_SIZE } from '../constants'
import { Segment, arcIntersectEntity, closestPointToPoint } from '../helpers'
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

  // private readonly _arrows = this.query(
  //   (q) => q.using(Block, Persistent, Color, Text, Arrow, Connector, ArrowTrim).write,
  // )

  private readonly arrows = this.query(
    (q) =>
      q.current.addedOrChanged
        .with(Arrow, Block)
        .write.trackWrites.with(Connector, ArrowTrim)
        .write.using(HitGeometries, HitArc, HitCapsule, Persistent, Color, Text)
        .write.using(...allHitGeometriesArray).read,
  )

  private readonly handles = this.query(
    (q) => q.current.changed.with(ArrowHandle).write.and.with(Block).write.trackWrites.using(Opacity).write,
  )

  private readonly blocks = this.query((q) => q.changed.with(Block).trackWrites)

  // private readonly blocks = this.query((q) =>
  //   q.current.with(comps.Block).write.orderBy((e) => uuidToNumber(e.read(comps.Block).id)),
  // )

  // public constructor() {
  //   super()
  //   this.schedule((s) => s.inAnyOrderWith(UpdateArrowDraw))
  // }

  public initialize(): void {
    this.addCommandListener(ArrowCommand.AddArrow, this.addArrow.bind(this))
    this.addCommandListener(ArrowCommand.DragArrow, this.dragArrow.bind(this))
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
      this.updateArrowTrim(arrowEntity)
    }
  }

  private addArrow(arrowEntity: Entity, position: [number, number]): void {
    const thickness = 6

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
    arrowEntity.add(ArrowTrim)

    this.updateConnector(arrowEntity, ArrowHandleKind.Start, position)
  }

  private dragArrow(arrowEntity: Entity, start: [number, number], end: [number, number]): void {
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
    // TODO this is kind of a bad way to prevent adding handles while dragging
    if (this.pointers.current.length > 0) return

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

    // if (this.pointers.current.length > 0) {
    //   this.hideTransformHandles()
    // }
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
    return [(hitCapsule.a[0] + hitCapsule.b[0]) / 2, (hitCapsule.a[1] + hitCapsule.b[1]) / 2]
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
    // update the connector
    const attachment = this.getAttachmentBlock()
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

  private getAttachmentBlock(): Entity | null {
    const intersects = this.intersect.getIntersectArray()

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
    const bWorld = arrowBlock.uvToWorld(arrow.b)
    const cWorld = arrowBlock.uvToWorld(arrow.c)
    const trim = arrowEntity.write(ArrowTrim)

    // create geometry
    let hitArc: HitArc | null = null
    let segment: Segment | null = null
    if (arrow.isCurved()) {
      hitArc = new HitArc()
      hitArc.update(aWorld, bWorld, cWorld)
    } else {
      segment = new Segment(aWorld, cWorld)
    }

    const startTrim = this.calculateTrim(connector.startBlockEntity, hitArc, segment, aWorld, 0)
    const endTrim = this.calculateTrim(connector.endBlockEntity, hitArc, segment, cWorld, 1)

    trim.tStart = startTrim
    trim.tEnd = endTrim

    // reset if the trim is too small
    if (endTrim - startTrim < 0.1) {
      trim.tStart = 0
      trim.tEnd = 1
    }
  }

  private calculateTrim(
    blockEntity: Entity | undefined,
    hitArc: HitArc | null,
    segment: Segment | null,
    referencePoint: [number, number],
    defaultValue: number,
  ): number {
    if (!blockEntity) return defaultValue

    const block = blockEntity.read(Block)
    let points: [number, number][] = []

    if (hitArc) {
      points = arcIntersectEntity(hitArc, blockEntity)
    } else if (segment) {
      points = segment.intersectBlock(block)
    }

    const intersect = closestPointToPoint(points, referencePoint)
    if (!intersect) return defaultValue

    let t: number | null = null
    if (hitArc) {
      t = hitArc.pointToParametric(intersect)
    } else if (segment) {
      t = segment.pointToParametric(intersect)
    }

    return t ?? defaultValue
  }

  // private updateArrowTrimForStraightLine(arrowEntity: Entity): void {
  //   const connector = arrowEntity.read(Connector)
  //   const arrow = arrowEntity.read(Arrow)

  //   const arrowBlock = arrowEntity.read(Block)
  //   const aWorld = arrowBlock.uvToWorld(arrow.a)
  //   const cWorld = arrowBlock.uvToWorld(arrow.c)
  //   const segment = new Segment(aWorld, cWorld)
  //   const trim = arrowEntity.write(ArrowTrim)

  //   let startTrim = 0
  //   if (connector.startBlockEntity) {
  //     const startBlock = connector.startBlockEntity.read(Block)
  //     const intersects = segment.intersectBlock(startBlock)
  //     if (intersects.length > 0) {
  //       const t = segment.pointToParametric(intersects[0])
  //       if (t !== null) startTrim = t
  //     }
  //   }

  //   let endTrim = 1
  //   if (connector.endBlockEntity) {
  //     const endBlock = connector.endBlockEntity.read(Block)
  //     const intersects = segment.intersectBlock(endBlock)
  //     if (intersects.length > 0) {
  //       const t = segment.pointToParametric(intersects[0])
  //       if (t !== null) endTrim = t
  //     }
  //   }

  //   trim.tStart = startTrim
  //   trim.tEnd = endTrim

  //   // reset if the trim is too small
  //   if (endTrim - startTrim < 0.1) {
  //     trim.tStart = 0
  //     trim.tEnd = 1
  //   }
  // }

  // private updateArrowTrimForCurvedArrow(arrowEntity: Entity, arc: HitArc): void {
  //   const connector = arrowEntity.read(Connector)
  //   const trim = arrowEntity.write(ArrowTrim)

  //   let startTrim = 0
  //   if (connector.startBlockEntity) {
  //     const points = arcIntersectEntity(arc, connector.startBlockEntity)
  //     const closestPoint = closestPointToPoint(points, arc.a)
  //     if (closestPoint) {
  //       const t = arc.pointToParametric(closestPoint)
  //       if (t !== null) startTrim = t
  //     }
  //   }

  //   let endTrim = 1
  //   if (connector.endBlockEntity) {
  //     const points = arcIntersectEntity(arc, connector.endBlockEntity)
  //     const closestPoint = closestPointToPoint(points, arc.c)
  //     if (closestPoint) {
  //       const t = arc.pointToParametric(closestPoint)
  //       if (t !== null) endTrim = t
  //     }
  //   }

  //   trim.tStart = startTrim
  //   trim.tEnd = endTrim

  //   // reset if the trim is too small
  //   if (endTrim - startTrim < 0.1) {
  //     trim.tStart = 0
  //     trim.tEnd = 1
  //   }
  // }

  private addOrUpdateHitGeometry(arrowEntity: Entity): void {
    if (!arrowEntity.has(HitGeometries)) {
      arrowEntity.add(HitGeometries)
    }

    const hitGeometries = arrowEntity.read(HitGeometries)

    const arrow = arrowEntity.read(Arrow)
    const block = arrowEntity.read(Block)
    const trim = arrowEntity.read(ArrowTrim)

    if (arrow.isCurved()) {
      this.deleteEntities(hitGeometries.capsules)
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
      hitArc.thickness = arrow.thickness * 2
      hitArc.update(a, b, c)
      hitArc.trim(trim.tStart, trim.tEnd)
    } else {
      this.deleteEntities(hitGeometries.arcs)

      const a = block.uvToWorld(arrow.a)
      const c = block.uvToWorld(arrow.c)

      let hitCapsuleEntity: Entity | undefined
      if (hitGeometries.capsules.length > 0) {
        hitCapsuleEntity = hitGeometries.capsules[0]
      } else {
        hitCapsuleEntity = this.createEntity(HitCapsule, { blockEntity: arrowEntity })
      }

      const hitCapsule = hitCapsuleEntity.write(HitCapsule)
      hitCapsule.radius = arrow.thickness * 2

      hitCapsule.a = a
      hitCapsule.b = c
      hitCapsule.trim(trim.tStart, trim.tEnd)
    }
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
