import { BaseSystem, CoreCommand, type CoreCommandArgs, CursorIcon } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { uuidToNumber } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'
import { DragStart, Locked, TransformBox, TransformHandle } from '../components'
import {
  TRANSFORM_BOX_RANK,
  TRANSFORM_HANDLE_CORNER_RANK,
  TRANSFORM_HANDLE_EDGE_RANK,
  TRANSFORM_HANDLE_ROTATE_RANK,
} from '../constants'
import { computeCenter, computeExtentsAlongAngle, rotatePoint } from '../helpers'
import { TransformCommand, type TransformCommandArgs, TransformHandleKind, type TransformResources } from '../types'
import { UpdateSelection } from './UpdateSelection'

interface TransformHandleDef {
  tag: string
  kind: TransformHandleKind
  alpha: number
  vector: [number, number]
  left: number
  top: number
  width: number
  height: number
  rotateZ: number
  rank: string
  cursor: CursorIcon
  // cursorKind: CursorKind
}

export class UpdateTransformBox extends BaseSystem<TransformCommandArgs & CoreCommandArgs> {
  protected readonly resources!: TransformResources

  private readonly selectedBlocks = this.query(
    (q) => q.added.removed.current.with(comps.Block, comps.Selected).write.using(comps.Aabb).read,
  )

  private readonly editedBlocks = this.query((q) => q.current.with(comps.Block, comps.Edited).write)

  private readonly transformBoxes = this.query(
    (q) =>
      q.current.changed
        .with(TransformBox, comps.Block)
        .write.trackWrites.using(TransformHandle, DragStart, comps.Hoverable, Locked, comps.Opacity).write,
  )

  private readonly handles = this.query((q) => q.changed.with(TransformHandle, comps.Block).write.trackWrites)

  private readonly blocks = this.query((q) =>
    q.current.with(comps.Block).write.orderBy((e) => uuidToNumber(e.read(comps.Block).id)),
  )

  private readonly camera = this.singleton.read(comps.Camera)

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection))
  }

  public initialize(): void {
    this.addCommandListener(TransformCommand.DragBlock, this.dragBlock.bind(this))
    this.addCommandListener(TransformCommand.AddTransformBox, this.addTransformBox.bind(this))
    this.addCommandListener(TransformCommand.UpdateTransformBox, this.updateTransformBox.bind(this))
    this.addCommandListener(TransformCommand.HideTransformBox, this.hideTransformBox.bind(this))
    this.addCommandListener(TransformCommand.ShowTransformBox, this.showTransformBox.bind(this))
    this.addCommandListener(TransformCommand.RemoveTransformBox, this.removeTransformBox.bind(this))
    this.addCommandListener(TransformCommand.StartTransformBoxEdit, this.startTransformBoxEdit.bind(this))
    this.addCommandListener(TransformCommand.EndTransformBoxEdit, this.endTransformBoxEdit.bind(this))
    this.addCommandListener(CoreCommand.SetZoom, this.onZoom.bind(this))
  }

  private removeTransformBox(): void {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to remove')
      return
    }

    const transformBoxEntity = this.transformBoxes.current[0]

    if (transformBoxEntity) {
      const transformBox = transformBoxEntity.read(TransformBox)
      this.deleteEntities(transformBox.handles)
      this.deleteEntity(transformBoxEntity)
    }
  }

  private addTransformBox(): void {
    const transformBoxEntity = this.createEntity(
      TransformBox,
      comps.Block,
      { id: crypto.randomUUID(), tag: this.resources.transformBoxTag, rank: TRANSFORM_BOX_RANK },
      DragStart,
    )

    this.updateTransformBox(transformBoxEntity)
  }

  private updateTransformBox(transformBoxEntity: Entity | null = null): void {
    if (!transformBoxEntity) {
      if (this.transformBoxes.current.length === 0) {
        console.warn('No transform box found to update')
        return
      }

      transformBoxEntity = this.transformBoxes.current[0]
    }

    let rotateZ = 0
    if (this.selectedBlocks.current.length > 0) {
      rotateZ = this.selectedBlocks.current[0].read(comps.Block).rotateZ
    }

    const selectedBlocks = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )

    for (let i = 1; i < selectedBlocks.length; i++) {
      const block = selectedBlocks[i].read(comps.Block)
      if (Math.abs(rotateZ - block.rotateZ) > 0.01) {
        rotateZ = 0
        break
      }
    }

    // size the transform box to selected blocks
    const extents = computeExtentsAlongAngle(selectedBlocks, rotateZ)

    const left = extents.left
    const top = extents.top
    const width = extents.right - extents.left
    const height = extents.bottom - extents.top

    Object.assign(transformBoxEntity.write(comps.Block), {
      left,
      top,
      width,
      height,
      rotateZ,
    })

    Object.assign(transformBoxEntity.write(DragStart), {
      startLeft: left,
      startTop: top,
      startWidth: width,
      startHeight: height,
      startRotateZ: rotateZ,
    })

    for (const blockEntity of selectedBlocks) {
      const block = blockEntity.read(comps.Block)
      if (!blockEntity.has(DragStart)) {
        blockEntity.add(DragStart)
      }
      const dragStart = blockEntity.write(DragStart)
      dragStart.startLeft = block.left
      dragStart.startTop = block.top
      dragStart.startWidth = block.width
      dragStart.startHeight = block.height
      dragStart.startRotateZ = block.rotateZ
    }

    this.addOrUpdateTransformHandles(transformBoxEntity)
  }

  private addOrUpdateTransformHandles(transformBoxEntity: Entity): void {
    const transformBoxBlock = transformBoxEntity.read(comps.Block)

    const { left, top, width, height, rotateZ } = transformBoxBlock
    const handleSize = 15 / this.camera.zoom
    const rotationHandleSize = 2 * handleSize
    const sideHandleSize = 2 * handleSize

    const handles: TransformHandleDef[] = []

    const rotateCursorKinds = [CursorIcon.RotateNW, CursorIcon.RotateNE, CursorIcon.RotateSW, CursorIcon.RotateSE]

    const selectedBlocks = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )
    let singularSelectedBlock: comps.Block | null = null
    let resizeMode = 'scale'
    if (selectedBlocks.length === 1) {
      singularSelectedBlock = selectedBlocks[0].read(comps.Block)
      const blockDef = this.getBlockDef(singularSelectedBlock.tag)
      resizeMode = blockDef?.resizeMode ?? resizeMode
    }

    let handleKind: TransformHandleKind
    switch (resizeMode) {
      case 'scale':
      case 'text':
        handleKind = TransformHandleKind.Scale
        break
      case 'free':
        handleKind = TransformHandleKind.Stretch
        break
      default:
        handleKind = TransformHandleKind.Scale
        break
    }

    // corners
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        handles.push({
          tag: this.resources.transformHandleTag,
          kind: handleKind,
          alpha: 128,
          vector: [xi * 2 - 1, yi * 2 - 1],
          left: left + width * xi - handleSize / 2,
          top: top + height * yi - handleSize / 2,
          width: handleSize,
          height: handleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_CORNER_RANK,
          cursor: xi + yi === 1 ? CursorIcon.NESW : CursorIcon.NWSE,
        })

        handles.push({
          tag: 'div',
          kind: TransformHandleKind.Rotate,
          alpha: 0,
          vector: [xi * 2 - 1, yi * 2 - 1],
          left: left - rotationHandleSize + handleSize / 2 + xi * (width + rotationHandleSize - handleSize),
          top: top - rotationHandleSize + handleSize / 2 + yi * (height + rotationHandleSize - handleSize),
          width: rotationHandleSize,
          height: rotationHandleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_ROTATE_RANK,
          cursor: rotateCursorKinds[xi + yi * 2],
        })
      }
    }

    // top & bottom edges
    for (let yi = 0; yi < 2; yi++) {
      handles.push({
        tag: 'div',
        kind: handleKind,
        alpha: 0,
        vector: [0, yi * 2 - 1],
        left,
        top: top + height * yi - sideHandleSize / 2,
        width,
        height: sideHandleSize,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursor: CursorIcon.NS,
      })
    }

    // left & right edges
    for (let xi = 0; xi < 2; xi++) {
      handles.push({
        tag: 'div',
        kind: resizeMode === 'text' ? TransformHandleKind.Stretch : handleKind,
        alpha: 0,
        vector: [xi * 2 - 1, 0],
        left: left + width * xi - sideHandleSize / 2,
        top,
        width: sideHandleSize,
        height,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursor: CursorIcon.EW,
      })
    }

    const center = computeCenter(transformBoxEntity)

    for (const handle of handles) {
      let handleEntity: Entity | undefined

      // find existing handle entity
      const handleEntities = transformBoxEntity.read(TransformBox).handles
      for (const entity of handleEntities) {
        const h = entity.read(TransformHandle)
        const b = entity.read(comps.Block)
        if (b.tag === handle.tag && h.vector[0] === handle.vector[0] && h.vector[1] === handle.vector[1]) {
          handleEntity = entity
          break
        }
      }

      // if no existing handle entity, create a new one
      if (!handleEntity) {
        handleEntity = this.createEntity(
          TransformHandle,
          comps.Block,
          { id: crypto.randomUUID() },
          comps.Hoverable,
          DragStart,
        )
      }

      const handleCenter: [number, number] = [handle.left + handle.width / 2, handle.top + handle.height / 2]
      const position = rotatePoint(handleCenter, center, rotateZ)
      const left = position[0] - handle.width / 2
      const top = position[1] - handle.height / 2

      Object.assign(handleEntity.write(TransformHandle), {
        kind: handle.kind,
        vector: handle.vector,
        transformBox: transformBoxEntity,
      })

      Object.assign(handleEntity.write(comps.Block), {
        left,
        top,
        tag: handle.tag,
        width: handle.width,
        height: handle.height,
        rotateZ: handle.rotateZ,
        rank: handle.rank,
      })

      Object.assign(handleEntity.write(comps.Hoverable), {
        cursor: handle.cursor,
      })

      Object.assign(handleEntity.write(DragStart), {
        startLeft: left,
        startTop: top,
        startWidth: handle.width,
        startHeight: handle.height,
        startRotateZ: handle.rotateZ,
      })
    }
  }

  private hideTransformBox(): void {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to hide')
      return
    }

    const transformBoxEntity = this.transformBoxes.current[0]

    if (!transformBoxEntity) {
      console.warn('No transform box found to hide')
      return
    }

    const transformBox = transformBoxEntity.read(TransformBox)
    for (const handleEntity of transformBox.handles) {
      if (!handleEntity.has(comps.Opacity)) {
        handleEntity.add(comps.Opacity)
      }

      const handleOpacity = handleEntity.write(comps.Opacity)
      handleOpacity.value = 0
    }

    if (!transformBoxEntity.has(comps.Opacity)) {
      transformBoxEntity.add(comps.Opacity)
    }
    const boxOpacity = transformBoxEntity.write(comps.Opacity)
    boxOpacity.value = 0
  }

  private showTransformBox(): void {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to show')
      return
    }

    const transformBoxEntity = this.transformBoxes.current[0]
    const transformBox = transformBoxEntity.read(TransformBox)
    for (const handleEntity of transformBox.handles) {
      if (handleEntity.has(comps.Opacity)) {
        handleEntity.remove(comps.Opacity)
      }
    }
    if (transformBoxEntity.has(comps.Opacity)) {
      transformBoxEntity.remove(comps.Opacity)
    }

    this.updateTransformBox()
  }

  private dragBlock(blockEntity: Entity, position: { left: number; top: number }): void {
    const block = blockEntity.write(comps.Block)

    block.left = position.left
    block.top = position.top

    if (blockEntity.has(TransformBox)) {
      this.onTransformBoxMove(blockEntity)
    } else if (blockEntity.has(TransformHandle)) {
      const handle = blockEntity.read(TransformHandle)
      const kind = handle.kind
      if (kind === TransformHandleKind.Rotate) {
        this.onRotateHandleMove(blockEntity)
      } else if (kind === TransformHandleKind.Scale) {
        this.onTransformHandleMove(blockEntity, true)
      } else if (kind === TransformHandleKind.Stretch) {
        this.onTransformHandleMove(blockEntity, false)
      }
    }
  }

  private onRotateHandleMove(handleEntity: Entity): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found')
      return
    }

    const boxEntity = this.transformBoxes.current[0]
    const boxCenter = computeCenter(boxEntity)

    const handleBlock = handleEntity.read(comps.Block)
    const handleCenter = [handleBlock.left + handleBlock.width / 2, handleBlock.top + handleBlock.height / 2]
    const angleHandle = Math.atan2(handleCenter[1] - boxCenter[1], handleCenter[0] - boxCenter[0])

    const { vector } = handleEntity.read(TransformHandle)
    const boxBlock = boxEntity.read(comps.Block)
    const handleStartAngle = Math.atan2(boxBlock.height * vector[1], boxBlock.width * vector[0]) + boxBlock.rotateZ

    const delta = angleHandle - handleStartAngle

    // const { rotateZ } = boxEntity.read(comps.Block)
    // if (!this.input.modDown) {
    //   const shift = this.updateRotationSnapLines(rotateZ + delta, boxEntity);
    //   delta += shift;
    // }

    handleEntity.write(comps.Block).rotateZ = (boxBlock.rotateZ + delta) % (2 * Math.PI)

    for (const blockEntity of this.selectedBlocks.current) {
      const { startLeft, startTop, startWidth, startHeight, startRotateZ } = blockEntity.read(DragStart)

      const block = blockEntity.write(comps.Block)
      block.rotateZ = (startRotateZ + delta) % (2 * Math.PI)

      const startCenter = [startLeft + startWidth / 2, startTop + startHeight / 2]

      const r = Math.hypot(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0])
      const angle = Math.atan2(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0]) + delta
      block.left = boxCenter[0] + Math.cos(angle) * r - block.width / 2
      block.top = boxCenter[1] + Math.sin(angle) * r - block.height / 2
    }
  }

  private onTransformHandleMove(handleEntity: Entity, maintainAspectRatio: boolean): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found')
      return
    }

    const handleBlock = handleEntity.read(comps.Block)
    const handleCenter: [number, number] = [
      handleBlock.left + handleBlock.width / 2,
      handleBlock.top + handleBlock.height / 2,
    ]

    const boxEntity = this.transformBoxes.current[0]
    const {
      startLeft: boxStartLeft,
      startTop: boxStartTop,
      startWidth: boxStartWidth,
      startHeight: boxStartHeight,
      startRotateZ: boxRotateZ,
    } = boxEntity.read(DragStart)

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

    if (maintainAspectRatio) {
      // Scale mode: maintain aspect ratio
      const startAspectRatio = boxStartWidth / boxStartHeight
      const newAspectRatio = boxEndWidth / boxEndHeight
      if (newAspectRatio > startAspectRatio) {
        boxEndHeight = boxEndWidth / startAspectRatio
      } else {
        boxEndWidth = boxEndHeight * startAspectRatio
      }
    } else {
      // Stretch mode: allow stretching in one dimension
      if (handleVec[0] === 0) {
        boxEndWidth = boxStartWidth
      } else if (handleVec[1] === 0) {
        boxEndHeight = boxStartHeight
      }
    }

    const vec: [number, number] = [handleVec[0] * boxEndWidth, handleVec[1] * boxEndHeight]
    const rotatedVector = rotatePoint(vec, [0, 0], boxRotateZ)

    const newBoxCenter = [oppositeCenter[0] + rotatedVector[0] / 2, oppositeCenter[1] + rotatedVector[1] / 2]

    const boxEndLeft = newBoxCenter[0] - boxEndWidth / 2
    const boxEndTop = newBoxCenter[1] - boxEndHeight / 2

    // TODO snapping

    for (const selectedEntity of this.selectedBlocks.current) {
      const { startLeft, startTop, startWidth, startHeight } = selectedEntity.read(DragStart)

      const block = selectedEntity.write(comps.Block)

      const left = (startLeft - boxStartLeft) * (boxEndWidth / boxStartWidth) + boxEndLeft
      const top = (startTop - boxStartTop) * (boxEndHeight / boxStartHeight) + boxEndTop

      const width = startWidth * (boxEndWidth / boxStartWidth)
      const height = startHeight * (boxEndHeight / boxStartHeight)

      if (!maintainAspectRatio) {
        block.hasStretched = true
      }

      block.left = left
      block.top = top
      block.width = width
      block.height = height
    }
  }

  private onTransformBoxMove(transformBoxEntity: Entity): void {
    const boxStart = transformBoxEntity.read(DragStart)
    const transformBoxBlock = transformBoxEntity.read(comps.Block)

    const dx = transformBoxBlock.left - boxStart.startLeft
    const dy = transformBoxBlock.top - boxStart.startTop

    if (dx === 0 && dy === 0) return

    for (const selectedBlock of this.selectedBlocks.current) {
      const blockStart = selectedBlock.read(DragStart)
      const block = selectedBlock.write(comps.Block)
      block.left = blockStart.startLeft + dx
      block.top = blockStart.startTop + dy
    }
  }

  private startTransformBoxEdit(): void {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to edit')
      return
    }

    const transformBoxEntity = this.transformBoxes.current[0]

    if (!transformBoxEntity) {
      console.warn('No transform box found to edit')
      return
    }

    if (!transformBoxEntity.has(Locked)) {
      transformBoxEntity.add(Locked)
    }

    const selectedBlocks = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )

    for (const blockEntity of selectedBlocks) {
      if (!blockEntity.has(comps.Edited)) {
        blockEntity.add(comps.Edited)
      }
    }
  }

  private endTransformBoxEdit(): void {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to end edit')
      return
    }
    const transformBoxEntity = this.transformBoxes.current[0]

    if (!transformBoxEntity) {
      console.warn('No transform box found to end edit')
      return
    }

    if (transformBoxEntity.has(Locked)) {
      transformBoxEntity.remove(Locked)
    }

    for (const blockEntity of this.editedBlocks.current) {
      blockEntity.remove(comps.Edited)
    }
  }

  public onZoom(): void {
    if (!this.transformBoxes.current.length) return
    this.addOrUpdateTransformHandles(this.transformBoxes.current[0])
  }
}
