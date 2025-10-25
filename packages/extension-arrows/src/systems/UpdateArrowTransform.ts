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
  ScaleWithZoom,
  Selected,
  Text,
  TransformBox,
  TransformHandle,
  allHitGeometriesArray,
} from '@infinitecanvas/core/components'
import { intersectPoint } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'

import { ArcArrow, ArrowHandle, ArrowTrim, ElbowArrow } from '../components'
import { TRANSFORM_HANDLE_RANK, TRANSFORM_HANDLE_SIZE } from '../constants'
import { calculateElbowPath } from '../helpers/calculateElbowPath'
import {
  ArrowCommand,
  type ArrowCommandArgs,
  ArrowHandleKind,
  ArrowHeadKind,
  ArrowKind,
  type ArrowResources,
} from '../types'

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

  protected readonly resources!: ArrowResources

  private readonly rankBounds = this.singleton.write(RankBounds)

  private readonly arrows = this.query(
    (q) =>
      q
        .using(
          Block,
          Connector,
          ArcArrow,
          ElbowArrow,
          HitGeometries,
          HitArc,
          HitCapsule,
          Persistent,
          Color,
          Text,
          ArrowTrim,
        )
        .write.using(...allHitGeometriesArray).read,
  )

  private readonly handles = this.query(
    (q) =>
      q.current.changed.with(ArrowHandle).write.and.with(Block).write.trackWrites.using(Opacity, ScaleWithZoom).write,
  )

  private readonly blocks = this.query(
    (q) => q.changed.and.current.with(Block).trackWrites.using(TransformBox, TransformHandle).read,
  )

  private readonly connectors = this.query((q) =>
    q.changed.with(Connector).write.trackWrites.and.withAny(ArcArrow, ElbowArrow),
  )

  private readonly selectedArrows = this.query((q) => q.current.with(ArcArrow, Selected).read)

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
  }

  public execute(): void {
    this.executeCommands()

    for (const connectorEntity of this.connectors.changed) {
      const connector = connectorEntity.read(Connector)

      const changedBlocks = []
      if (connector.startNeedsUpdate) changedBlocks.push(connector.startBlockEntity)
      if (connector.endNeedsUpdate) changedBlocks.push(connector.endBlockEntity)

      for (const blockEntity of changedBlocks) {
        if (!blockEntity) continue
        const block = blockEntity.read(Block)
        const connector = connectorEntity.read(Connector)
        const handleKind = connector.startBlockId === block.id ? ArrowHandleKind.Start : ArrowHandleKind.End
        const uv = handleKind === ArrowHandleKind.Start ? connector.startBlockUv : connector.endBlockUv
        const position = block.uvToWorld(uv)

        if (connectorEntity.has(ArcArrow)) {
          this.updateArcArrow(connectorEntity, handleKind, position)
        } else if (connectorEntity.has(ElbowArrow)) {
          this.updateElbowArrow(connectorEntity, handleKind, position)
        }
      }

      if (changedBlocks.length > 0) {
        const c = connectorEntity.write(Connector)
        c.startNeedsUpdate = false
        c.endNeedsUpdate = false
      }
    }
  }

  private addArrow(arrowEntity: Entity, position: [number, number], kind: ArrowKind): void {
    const thickness = 4

    const arrowTag = kind === ArrowKind.Elbow ? 'ic-elbow-arrow' : 'ic-arc-arrow'

    if (this.grid.enabled) {
      this.grid.snapToGrid(position)
    }

    const block = {
      tag: arrowTag,
      id: crypto.randomUUID(),
      rank: this.rankBounds.genNext().toString(),
      left: position[0] - thickness / 2,
      top: position[1] - thickness / 2,
      width: thickness,
      height: thickness,
    }

    arrowEntity.add(Block, block)
    arrowEntity.add(Persistent)

    if (kind === ArrowKind.Arc) {
      arrowEntity.add(ArcArrow, {
        a: [0, 0],
        b: [0.5, 0.5],
        c: [1, 1],
        thickness,
        startArrowHead: ArrowHeadKind.None,
        endArrowHead: ArrowHeadKind.V,
      })
    } else if (kind === ArrowKind.Elbow) {
      arrowEntity.add(ElbowArrow)

      const arrow = arrowEntity.write(ElbowArrow)
      arrow.fromJson({
        points: [0, 0, 0.5, 0, 0.5, 1, 1, 1],
        thickness,
        startArrowHead: ArrowHeadKind.None,
        endArrowHead: ArrowHeadKind.V,
      })
    }

    arrowEntity.add(Color)
    // arrowEntity.add(Text)
    arrowEntity.add(Connector)

    this.updateConnector(arrowEntity, ArrowHandleKind.Start, position)
  }

  private drawArrow(arrowEntity: Entity, start: [number, number], end: [number, number]): void {
    if (this.grid.enabled) {
      this.grid.snapToGrid(start)
      this.grid.snapToGrid(end)
    }

    if (arrowEntity.has(ArcArrow)) {
      const block = arrowEntity.write(Block)
      block.left = Math.min(start[0], end[0])
      block.top = Math.min(start[1], end[1])
      block.width = Math.abs(start[0] - end[0])
      block.height = Math.abs(start[1] - end[1])

      const arrow = arrowEntity.write(ArcArrow)
      const ax = start[0] < end[0] ? 0 : 1
      const ay = start[1] < end[1] ? 0 : 1
      arrow.a = [ax, ay]
      arrow.b = [0.5, 0.5]
      arrow.c = [1 - ax, 1 - ay]
    } else if (arrowEntity.has(ElbowArrow)) {
      this.updateElbowArrow(arrowEntity, ArrowHandleKind.End, end)
    }

    this.updateConnector(arrowEntity, ArrowHandleKind.End, end)
  }

  private removeArrow(arrowEntity: Entity): void {
    this.deleteEntity(arrowEntity)
  }

  private removeTransformHandles(): void {
    this.deleteEntities(this.handles.current)

    this.emitCommand(CoreCommand.CreateCheckpoint)

    // const isEditing = this.selectedBlocks.current.every((e) => e.has(comps.Edited))
    // if (isEditing) {
    //   this.endTransformHandlesEdit()
    // }
  }

  private addTransformHandles(arrowEntity: Entity): void {
    const handleKinds = [ArrowHandleKind.Start, ArrowHandleKind.End]
    if (arrowEntity.has(ArcArrow)) {
      handleKinds.push(ArrowHandleKind.Middle)
    }

    const handles = handleKinds.map((handleKind) =>
      this.createEntity(
        ArrowHandle,
        {
          kind: handleKind,
        },
        Block,
        { id: crypto.randomUUID(), tag: 'ic-circular-handle', rank: TRANSFORM_HANDLE_RANK },
        ScaleWithZoom,
      ),
    )

    this.updateTransformHandles(arrowEntity, handles)
  }

  private updateTransformHandles(arrowEntity: Entity, handles: readonly Entity[] = this.handles.current): void {
    const handleSize = TRANSFORM_HANDLE_SIZE

    for (const handleEntity of handles) {
      const handle = handleEntity.write(ArrowHandle)
      handle.arrowEntity = arrowEntity

      const position = this.getHandlePosition(arrowEntity, handle.kind)

      const handleBlock = handleEntity.write(Block)
      handleBlock.left = position[0] - handleSize / 2
      handleBlock.top = position[1] - handleSize / 2
      handleBlock.width = handleSize
      handleBlock.height = handleSize

      const swz = handleEntity.write(ScaleWithZoom)
      swz.startWidth = handleSize
      swz.startHeight = handleSize
      swz.startLeft = handleBlock.left
      swz.startTop = handleBlock.top
    }
  }

  private getHandlePosition(arrowEntity: Entity, handleKind: ArrowHandleKind): [number, number] {
    const block = arrowEntity.read(Block)

    if (arrowEntity.has(ArcArrow)) {
      const arrow = arrowEntity.read(ArcArrow)
      switch (handleKind) {
        case ArrowHandleKind.Start:
          return block.uvToWorld(arrow.a)
        case ArrowHandleKind.Middle:
          return this.getTrimmedCenter(arrowEntity) ?? block.uvToWorld(arrow.b)
        case ArrowHandleKind.End:
          return block.uvToWorld(arrow.c)
      }
    }

    if (arrowEntity.has(ElbowArrow)) {
      const arrow = arrowEntity.read(ElbowArrow)
      switch (handleKind) {
        case ArrowHandleKind.Start:
          return block.uvToWorld(arrow.getPoint(0))
        case ArrowHandleKind.End:
          return block.uvToWorld(arrow.getPoint(arrow.pointCount - 1))
      }
    }

    console.warn('Arrow entity has no recognized arrow component')
    return [0, 0]
  }

  private getTrimmedCenter(arrowEntity: Entity): [number, number] | null {
    // this.addOrUpdateHitGeometry(arrowEntity)

    const arrow = arrowEntity.read(ArcArrow)
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
    if (blockEntity.has(ArcArrow)) {
      this.onArcArrowDrag(blockEntity)
    } else if (blockEntity.has(ElbowArrow)) {
      this.onElbowArrowDrag(blockEntity)
    } else if (blockEntity.has(ArrowHandle)) {
      this.onArrowHandleDrag(blockEntity)
    }
  }

  private onArcArrowDrag(arrowEntity: Entity): void {
    if (arrowEntity.read(Connector).startBlockEntity) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(ArcArrow)
      const start = block.uvToWorld(arrow.a)
      this.updateConnector(arrowEntity, ArrowHandleKind.Start, start)
    }

    if (arrowEntity.read(Connector).endBlockEntity) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(ArcArrow)
      const end = block.uvToWorld(arrow.c)
      this.updateConnector(arrowEntity, ArrowHandleKind.End, end)
    }
  }

  private onElbowArrowDrag(arrowEntity: Entity): void {
    if (arrowEntity.read(Connector).startBlockEntity) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(ElbowArrow)
      const start = block.uvToWorld(arrow.getPoint(0))
      this.updateConnector(arrowEntity, ArrowHandleKind.Start, start)
    }

    if (arrowEntity.read(Connector).endBlockEntity) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(ElbowArrow)
      const end = block.uvToWorld(arrow.getPoint(arrow.pointCount - 1))
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

    if (this.grid.enabled) {
      this.grid.snapToGrid(handlePosition)
    }

    if (arrowEntity.has(ArcArrow)) {
      this.updateArcArrow(arrowEntity, handle.kind, handlePosition)
    } else if (arrowEntity.has(ElbowArrow)) {
      this.updateElbowArrow(arrowEntity, handle.kind, handlePosition)
    }

    if (handle.kind !== ArrowHandleKind.Middle) {
      this.updateConnector(arrowEntity, handle.kind, handlePosition)
    }
  }

  private updateArcArrow(arrowEntity: Entity, handleKind: ArrowHandleKind, handlePosition: [number, number]): void {
    const arrow = arrowEntity.write(ArcArrow)
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

  private updateElbowArrow(arrowEntity: Entity, handleKind: ArrowHandleKind, handlePosition: [number, number]): void {
    const arrow = arrowEntity.write(ElbowArrow)
    const arrowBlock = arrowEntity.write(Block)

    let start: [number, number]
    let end: [number, number]

    if (handleKind === ArrowHandleKind.Start) {
      start = handlePosition
      const endUv = arrow.getPoint(arrow.pointCount - 1)
      end = arrowBlock.uvToWorld(endUv)
    } else {
      const startUv = arrow.getPoint(0)
      start = arrowBlock.uvToWorld(startUv)
      end = handlePosition
    }

    const connector = arrowEntity.read(Connector)

    const path = calculateElbowPath(
      start,
      end,
      connector.startBlockEntity,
      connector.endBlockEntity,
      this.resources.elbowArrowPadding,
    )

    arrowBlock.boundPoints(path)

    for (let i = 0; i < path.length; i++) {
      const point = path[i]
      arrow.setPoint(i, arrowBlock.worldToUv(point))
    }

    arrow.pointCount = path.length
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
    const intersects = intersectPoint(handlePosition, this.blocks.current)

    for (const intersect of intersects) {
      if (!intersect.has(ArrowHandle) && !intersect.has(ArcArrow) && !intersect.has(ElbowArrow)) {
        return intersect
      }
    }

    return null
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
}
