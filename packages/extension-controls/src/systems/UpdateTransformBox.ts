import { BaseSystem, BlockCommand, type BlockCommandArgs, CursorIcon } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'

import { TransformBox, TransformHandle } from '../components'
import {
  TRANSFORM_BOX_RANK,
  TRANSFORM_HANDLE_CORNER_RANK,
  TRANSFORM_HANDLE_EDGE_RANK,
  TRANSFORM_HANDLE_ROTATE_RANK,
} from '../constants'
import { computeCenter, computeExtentsAlongAngle, rotatePoint } from '../helpers'
import { ControlCommand, type ControlCommandArgs, TransformHandleKind } from '../types'
import { UpdateSelection } from './UpdateSelection'

interface TransformHandleDef {
  // tag: keyof typeof Tag
  kind: TransformHandleKind
  alpha: number
  vector: [number, number]
  left: number
  top: number
  width: number
  height: number
  rotateZ: number
  rank: string
  hoverCursor: CursorIcon
  // cursorKind: CursorKind
}

export class UpdateTransformBox extends BaseSystem<ControlCommandArgs & BlockCommandArgs> {
  private readonly selectedBlocks = this.query(
    (q) => q.added.removed.current.with(comps.Block, comps.Selected).write.using(comps.Aabb).read,
  )

  private readonly transformBoxes = this.query(
    (q) => q.current.with(comps.Block, TransformBox, comps.Draggable).write.using(TransformHandle).write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection))
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.UpdateBlockPosition, this.onBlockMove.bind(this))
    this.addCommandListener(ControlCommand.AddOrReplaceTransformBox, this.addOrReplaceTransformBox.bind(this))
    this.addCommandListener(ControlCommand.HideTransformBox, this.hideTransformBox.bind(this))
    this.addCommandListener(ControlCommand.RemoveTransformBox, this.removeTransformBox.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private removeTransformBox(): void {
    for (const transformBoxEntity of this.transformBoxes.current) {
      const transformBox = transformBoxEntity.read(TransformBox)
      this.deleteEntities(transformBox.handles)
    }
    this.deleteEntities(this.transformBoxes.current)
  }

  private addOrReplaceTransformBox(): void {
    this.removeTransformBox()

    if (this.selectedBlocks.current.length === 0) return

    let rotateZ = this.selectedBlocks.current[0].read(comps.Block).rotateZ
    for (let i = 1; i < this.selectedBlocks.current.length; i++) {
      const block = this.selectedBlocks.current[i].read(comps.Block)
      if (Math.abs(rotateZ - block.rotateZ) > 0.01) {
        rotateZ = 0
        break
      }
    }

    // size the transform box to selected blocks
    const extents = computeExtentsAlongAngle(this.selectedBlocks.current, rotateZ)

    const left = extents.left
    const top = extents.top
    const width = extents.right - extents.left
    const height = extents.bottom - extents.top

    const transformBoxEntity = this.createEntity(
      comps.Block,
      {
        id: crypto.randomUUID(),
        blue: 255,
        alpha: 128,
        rank: TRANSFORM_BOX_RANK,
        left,
        top,
        width,
        height,
        rotateZ,
      },
      TransformBox,
      comps.Draggable,
      {
        startLeft: left,
        startTop: top,
        startWidth: width,
        startHeight: height,
        startRotateZ: rotateZ,
      },
    )

    for (const blockEntity of this.selectedBlocks.current) {
      const block = blockEntity.read(comps.Block)
      const draggable = blockEntity.write(comps.Draggable)
      draggable.startLeft = block.left
      draggable.startTop = block.top
      draggable.startWidth = block.width
      draggable.startHeight = block.height
      draggable.startRotateZ = block.rotateZ
    }

    this.addTransformHandles(transformBoxEntity)
  }

  private addTransformHandles(transformBoxEntity: Entity): void {
    const transformBoxBlock = transformBoxEntity.read(comps.Block)
    const { left, top, width, height, rotateZ } = transformBoxBlock
    const handleSize = 15
    const rotationHandleSize = 2 * handleSize
    const sideHandleSize = 2 * handleSize

    const handles: TransformHandleDef[] = []

    const rotateCursorKinds = [CursorIcon.RotateNW, CursorIcon.RotateNE, CursorIcon.RotateSW, CursorIcon.RotateSE]

    // corners
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        handles.push({
          // tag: Tag.TransformHandle,
          kind: TransformHandleKind.Scale,
          alpha: 128,
          vector: [xi * 2 - 1, yi * 2 - 1],
          left: left + width * xi - handleSize / 2,
          top: top + height * yi - handleSize / 2,
          width: handleSize,
          height: handleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_CORNER_RANK,
          hoverCursor: xi + yi === 1 ? CursorIcon.NESW : CursorIcon.NWSE,
        })

        handles.push({
          // tag: Tag.Invisible,
          kind: TransformHandleKind.Rotate,
          alpha: 0,
          vector: [xi * 2 - 1, yi * 2 - 1],
          left: left - rotationHandleSize + handleSize / 2 + xi * (width + rotationHandleSize - handleSize),
          top: top - rotationHandleSize + handleSize / 2 + yi * (height + rotationHandleSize - handleSize),
          width: rotationHandleSize,
          height: rotationHandleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_ROTATE_RANK,
          hoverCursor: rotateCursorKinds[xi + yi * 2],
        })
      }
    }

    // top & bottom edges
    // const stretchableY = selectedBlocks.length === 1 && isStretchableY(selectedBlocks[0])
    for (let yi = 0; yi < 2; yi++) {
      // let kind = TransformHandleKind.LeftScale
      // if (stretchableY) {
      //   kind = yi === 0 ? TransformHandleKind.TopStretch : TransformHandleKind.BottomStretch
      // } else {
      // kind = yi === 0 ? TransformHandleKind.TopScale : TransformHandleKind.BottomScale
      // }

      handles.push({
        // tag: Tag.Invisible,
        kind: TransformHandleKind.Scale,
        alpha: 0,
        vector: [0, yi * 2 - 1],
        left,
        top: top + height * yi - sideHandleSize / 2,
        width,
        height: sideHandleSize,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        hoverCursor: CursorIcon.NS,
      })
    }

    // left & right edges
    // const stretchableX = selectedBlocks.length === 1 && isStretchableX(selectedBlocks[0])
    for (let xi = 0; xi < 2; xi++) {
      // let kind = TransformHandleKind.LeftScale
      // if (stretchableX) {
      // kind = xi === 0 ? TransformHandleKind.LeftStretch : TransformHandleKind.RightStretch
      // } else {
      // kind = xi === 0 ? TransformHandleKind.LeftScale : TransformHandleKind.RightScale
      // }

      handles.push({
        // tag: Tag.Invisible,
        kind: TransformHandleKind.Scale,
        alpha: 0,
        vector: [xi * 2 - 1, 0],
        left: left + width * xi - sideHandleSize / 2,
        top,
        width: sideHandleSize,
        height,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        hoverCursor: CursorIcon.EW,
      })
    }

    const center = computeCenter(transformBoxEntity)

    for (const handle of handles) {
      const handleCenter: [number, number] = [handle.left + handle.width / 2, handle.top + handle.height / 2]
      const position = rotatePoint(handleCenter, center, rotateZ)
      const left = position[0] - handle.width / 2
      const top = position[1] - handle.height / 2

      this.createEntity(
        TransformHandle,
        {
          kind: handle.kind,
          vector: handle.vector,
          transformBox: transformBoxEntity,
        },
        comps.Block,
        {
          id: crypto.randomUUID(),
          alpha: handle.alpha,
          red: 255,
          left,
          top,
          width: handle.width,
          height: handle.height,
          rotateZ: handle.rotateZ,
          rank: handle.rank,
        },
        // comps.Aabb,
        comps.Draggable,
        {
          startLeft: left,
          startTop: top,
          startWidth: handle.width,
          startHeight: handle.height,
          startRotateZ: handle.rotateZ,
          hoverCursor: handle.hoverCursor,
        },
        // comps.Hoverable,
      )
    }
  }

  private hideTransformBox(): void {
    for (const transformBoxEntity of this.transformBoxes.current) {
      const transformBox = transformBoxEntity.read(TransformBox)
      for (const handleEntity of transformBox.handles) {
        const handleBlock = handleEntity.write(comps.Block)
        handleBlock.alpha = 0
      }

      const transformBoxBlock = transformBoxEntity.write(comps.Block)
      transformBoxBlock.alpha = 0
    }
  }

  private onBlockMove(blockEntity: Entity, position: { left: number; top: number }): void {
    if (blockEntity.has(TransformBox)) {
      this.onTransformBoxMove(blockEntity, position)
    } else if (blockEntity.has(TransformHandle)) {
      const handle = blockEntity.read(TransformHandle)
      const kind = handle.kind.toString()
      if (kind.endsWith('rotate')) {
        this.onRotateHandleMove(blockEntity, position)
      } else if (kind.endsWith('scale')) {
        this.onScaleHandleMove(blockEntity, position)
      }
    }
  }

  private onRotateHandleMove(handleEntity: Entity, position: { left: number; top: number }): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found')
      return
    }

    const handleBlock = handleEntity.write(comps.Block)
    handleBlock.left = position.left
    handleBlock.top = position.top

    const boxEntity = this.transformBoxes.current[0]
    const { width, height, rotateZ } = boxEntity.read(comps.Block)

    const boxCenter = computeCenter(boxEntity)
    const handleCenter = computeCenter(handleEntity)

    const angleHandle = Math.atan2(handleCenter[1] - boxCenter[1], handleCenter[0] - boxCenter[0])

    const { vector } = handleEntity.read(TransformHandle)
    // const vec = getTransformHandleVector(kind)
    const handleStartAngle = Math.atan2(height * vector[1], width * vector[0]) + rotateZ

    const delta = angleHandle - handleStartAngle

    // const { rotateZ } = boxEntity.read(comps.Block)
    // if (!this.input.modDown) {
    //   const shift = this.updateRotationSnapLines(rotateZ + delta, boxEntity);
    //   delta += shift;
    // }

    handleEntity.write(comps.Block).rotateZ = (rotateZ + delta) % (2 * Math.PI)

    for (const blockEntity of this.selectedBlocks.current) {
      const { startLeft, startTop, startWidth, startHeight, startRotateZ } = blockEntity.read(comps.Draggable)

      const block = blockEntity.write(comps.Block)
      block.rotateZ = (startRotateZ + delta) % (2 * Math.PI)

      const startCenter = [startLeft + startWidth / 2, startTop + startHeight / 2]

      const r = Math.hypot(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0])
      const angle = Math.atan2(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0]) + delta
      block.left = boxCenter[0] + Math.cos(angle) * r - block.width / 2
      block.top = boxCenter[1] + Math.sin(angle) * r - block.height / 2
    }
  }

  private onScaleHandleMove(handleEntity: Entity, position: { left: number; top: number }): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found')
      return
    }

    const handleBlock = handleEntity.write(comps.Block)
    handleBlock.left = position.left
    handleBlock.top = position.top
    const handleCenter = computeCenter(handleEntity)

    const boxEntity = this.transformBoxes.current[0]
    const {
      startLeft: boxStartLeft,
      startTop: boxStartTop,
      startWidth: boxStartWidth,
      startHeight: boxStartHeight,
      startRotateZ: boxRotateZ,
    } = boxEntity.read(comps.Draggable)

    // get the position of the opposite handle of the transform box
    const { vector, kind: handleKind } = handleEntity.read(TransformHandle)
    const handleVec: [number, number] = [vector[0], vector[1]]

    const oppositeHandle = boxEntity.read(TransformBox).handles.find((h) => {
      const { vector, kind } = h.read(TransformHandle)
      return handleKind === kind && handleVec[0] === -vector[0] && handleVec[1] === -vector[1]
    })
    if (!oppositeHandle) {
      console.error('No opposite handle found for', handleKind, handleVec)
      return
    }

    const oppositeCenter = computeCenter(oppositeHandle)
    let difference: [number, number] = [handleCenter[0] - oppositeCenter[0], handleCenter[1] - oppositeCenter[1]]
    difference = rotatePoint(difference, [0, 0], -boxRotateZ)

    let boxEndWidth = Math.max(Math.abs(difference[0]), 10)
    let boxEndHeight = Math.max(Math.abs(difference[1]), 10)

    const startAspectRatio = boxStartWidth / boxStartHeight
    const newAspectRatio = boxEndWidth / boxEndHeight
    if (newAspectRatio > startAspectRatio) {
      boxEndHeight = boxEndWidth / startAspectRatio
    } else {
      boxEndWidth = boxEndHeight * startAspectRatio
    }

    const vec: [number, number] = [handleVec[0] * boxEndWidth, handleVec[1] * boxEndHeight]
    const rotatedVector = rotatePoint(vec, [0, 0], boxRotateZ)

    const newBoxCenter = [oppositeCenter[0] + rotatedVector[0] / 2, oppositeCenter[1] + rotatedVector[1] / 2]

    // const dims = rotatePoint([boxEndWidth, boxEndHeight], [0, 0], boxRotateZ)
    // boxEndWidth = dims[0]
    // boxEndHeight = dims[1]

    const boxEndLeft = newBoxCenter[0] - boxEndWidth / 2
    const boxEndTop = newBoxCenter[1] - boxEndHeight / 2

    // const boxBlock = boxEntity.write(comps.Block)
    // boxBlock.left = boxEndLeft
    // boxBlock.top = boxEndTop
    // boxBlock.width = boxEndWidth
    // boxBlock.height = boxEndHeight

    // TODO scale snapping

    for (const selectedEntity of this.selectedBlocks.current) {
      const { startLeft, startTop, startWidth, startHeight } = selectedEntity.read(comps.Draggable)

      const block = selectedEntity.write(comps.Block)

      block.left = (startLeft - boxStartLeft) * (boxEndWidth / boxStartWidth) + boxEndLeft
      block.top = (startTop - boxStartTop) * (boxEndHeight / boxStartHeight) + boxEndTop

      block.width = startWidth * (boxEndWidth / boxStartWidth)
      block.height = startHeight * (boxEndHeight / boxStartHeight)
    }
  }

  private onTransformBoxMove(transformBoxEntity: Entity, position: { left: number; top: number }): void {
    const block = transformBoxEntity.write(comps.Block)
    const dx = position.left - block.left
    const dy = position.top - block.top

    block.left = position.left
    block.top = position.top

    for (const selectedBlock of this.selectedBlocks.current) {
      const block = selectedBlock.write(comps.Block)
      block.left += dx
      block.top += dy
    }
  }
}
