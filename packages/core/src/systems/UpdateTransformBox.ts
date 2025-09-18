import { type Entity, co } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import {
  Aabb,
  Block,
  DragStart,
  Edited,
  Locked,
  Opacity,
  Selected,
  Text,
  ToBeDeleted,
  TransformBox,
  TransformHandle,
} from '../components'
import {
  TRANSFORM_BOX_RANK,
  TRANSFORM_HANDLE_CORNER_RANK,
  TRANSFORM_HANDLE_EDGE_RANK,
  TRANSFORM_HANDLE_ROTATE_RANK,
} from '../constants'
// import * as comps from '@infinitecanvas/core/components'
import { newRotationMatrix, newRotationMatrixAroundPoint, transformPoint, uuidToNumber } from '../helpers'
import { CursorKind, TransformHandleKind } from '../types'
import { UpdateBlocks } from './UpdateBlocks'
import { UpdateCamera } from './UpdateCamera'
import { UpdateSelection } from './UpdateSelection'

interface TransformHandleDef {
  tag: string
  kind: TransformHandleKind
  vector: [number, number]
  cursorKind: CursorKind
  left: number
  top: number
  width: number
  height: number
  rotateZ: number
  rank: string
}

export class UpdateTransformBox extends BaseSystem<CoreCommandArgs> {
  private readonly selectedBlocks = this.query(
    (q) => q.added.removed.current.with(Block, Selected).write.using(Text).write.using(Aabb).read,
  )

  private readonly editedBlocks = this.query((q) => q.current.with(Block, Edited).write)

  private readonly transformBoxes = this.query(
    (q) =>
      q.current.changed.with(TransformBox, Block).write.trackWrites.using(TransformHandle, DragStart, Locked, Opacity)
        .write,
  )

  private readonly handles = this.query((q) => q.changed.with(TransformHandle, Block).write.trackWrites)

  private readonly blocks = this.query((q) =>
    q.current.with(Block).write.orderBy((e) => uuidToNumber(e.read(Block).id)),
  )

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection, UpdateBlocks, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.DragBlock, this.dragBlock.bind(this))
    this.addCommandListener(CoreCommand.AddOrUpdateTransformBox, this.addOrUpdateTransformBox.bind(this))
    this.addCommandListener(CoreCommand.UpdateTransformBox, this.updateTransformBox.bind(this))
    this.addCommandListener(CoreCommand.HideTransformBox, this.hideTransformBox.bind(this))
    this.addCommandListener(CoreCommand.ShowTransformBox, this.showTransformBox.bind(this))
    this.addCommandListener(CoreCommand.RemoveTransformBox, this.removeTransformBox.bind(this))
    this.addCommandListener(CoreCommand.StartTransformBoxEdit, this.startTransformBoxEdit.bind(this))
    this.addCommandListener(CoreCommand.EndTransformBoxEdit, this.endTransformBoxEdit.bind(this))
    this.addCommandListener(CoreCommand.SetZoom, this.onZoom.bind(this))
  }

  private removeTransformBox(): void {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to remove')
      return
    }

    const transformBoxEntity = this.transformBoxes.current[0]
    const transformBox = transformBoxEntity.read(TransformBox)

    this.deleteEntities(transformBox.handles)
    this.deleteEntity(transformBoxEntity)

    const isEditing = this.selectedBlocks.current.every((e) => e.has(Edited))
    if (isEditing) {
      this.endTransformBoxEdit()
    }
  }

  private addOrUpdateTransformBox(): void {
    let transformBoxEntity: Entity | null = null

    if (this.transformBoxes.current.length) {
      transformBoxEntity = this.transformBoxes.current[0]
    } else {
      transformBoxEntity = this.createEntity(
        TransformBox,
        Block,
        { id: crypto.randomUUID(), tag: this.resources.tags.transformBox, rank: TRANSFORM_BOX_RANK },
        DragStart,
      )
    }

    this.updateTransformBox(transformBoxEntity)

    // check if all of the blocks are already edited
    const isEditing = this.selectedBlocks.current.every((e) => e.has(Edited))

    if (isEditing) {
      this.hideTransformBox(transformBoxEntity)
      this.startTransformBoxEdit(transformBoxEntity)
    }
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
      rotateZ = this.selectedBlocks.current[0].read(Block).rotateZ
    }

    const selectedBlocks = this.selectedBlocks.current.filter((e) => e.read(Selected).selectedBy === this.resources.uid)

    for (let i = 1; i < selectedBlocks.length; i++) {
      const block = selectedBlocks[i].read(Block)
      if (Math.abs(rotateZ - block.rotateZ) > 0.01) {
        rotateZ = 0
        break
      }
    }

    // size the transform box to selected blocks
    const corners = selectedBlocks.flatMap((e) => {
      const block = e.read(Block)
      return block.getCorners()
    })

    const boxBlock = transformBoxEntity.write(Block)
    boxBlock.rotateZ = rotateZ
    boxBlock.boundPoints(corners)

    Object.assign(transformBoxEntity.write(DragStart), {
      startLeft: boxBlock.left,
      startTop: boxBlock.top,
      startWidth: boxBlock.width,
      startHeight: boxBlock.height,
      startRotateZ: boxBlock.rotateZ,
    })

    for (const blockEntity of selectedBlocks) {
      const block = blockEntity.read(Block)
      if (!blockEntity.has(DragStart)) {
        blockEntity.add(DragStart)
      }
      const dragStart = blockEntity.write(DragStart)
      dragStart.startLeft = block.left
      dragStart.startTop = block.top
      dragStart.startWidth = block.width
      dragStart.startHeight = block.height
      dragStart.startRotateZ = block.rotateZ

      if (blockEntity.has(Text)) {
        dragStart.startFontSize = blockEntity.read(Text).fontSize
      }
    }

    this.addOrUpdateTransformHandles(transformBoxEntity)
  }

  private addOrUpdateTransformHandles(transformBoxEntity: Entity): void {
    const transformBoxBlock = transformBoxEntity.read(Block)

    const { left, top, width, height, rotateZ } = transformBoxBlock
    const center = transformBoxBlock.getCenter()
    const handleSize = 12 / this.camera.zoom
    const rotationHandleSize = 2 * handleSize
    const sideHandleSize = 2 * handleSize

    const handles: TransformHandleDef[] = []

    const rotateCursorKinds = [CursorKind.RotateNW, CursorKind.RotateNE, CursorKind.RotateSW, CursorKind.RotateSE]

    const selectedBlocks = this.selectedBlocks.current.filter((e) => e.read(Selected).selectedBy === this.resources.uid)
    let singularSelectedBlock: Block | null = null
    let resizeMode = 'scale'
    if (selectedBlocks.length === 1) {
      singularSelectedBlock = selectedBlocks[0].read(Block)
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
    const scaledWidth = width * this.camera.zoom
    const scaledHeight = height * this.camera.zoom
    const minDim = Math.min(scaledWidth, scaledHeight)
    const threshold = 15
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        if (xi + yi !== 1 && minDim < threshold / 2) {
          continue
        }

        if (xi + yi === 1 && scaledHeight < threshold) {
          continue
        }

        handles.push({
          tag: this.resources.tags.transformHandle,
          kind: handleKind,
          vector: [xi * 2 - 1, yi * 2 - 1],
          left: left + width * xi - handleSize / 2,
          top: top + height * yi - handleSize / 2,
          width: handleSize,
          height: handleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_CORNER_RANK,
          cursorKind: xi + yi === 1 ? CursorKind.NESW : CursorKind.NWSE,
        })

        handles.push({
          tag: 'div',
          kind: TransformHandleKind.Rotate,
          vector: [xi * 2 - 1, yi * 2 - 1],
          left: left - rotationHandleSize + handleSize / 2 + xi * (width + rotationHandleSize - handleSize),
          top: top - rotationHandleSize + handleSize / 2 + yi * (height + rotationHandleSize - handleSize),
          width: rotationHandleSize,
          height: rotationHandleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_ROTATE_RANK,
          cursorKind: rotateCursorKinds[xi + yi * 2],
        })
      }
    }

    // top & bottom edges
    for (let yi = 0; yi < 2; yi++) {
      handles.push({
        tag: 'div',
        kind: handleKind,
        vector: [0, yi * 2 - 1],
        left,
        top: top + height * yi - sideHandleSize / 2,
        width,
        height: sideHandleSize,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursorKind: CursorKind.NS,
      })
    }

    // left & right edges
    for (let xi = 0; xi < 2; xi++) {
      handles.push({
        tag: 'div',
        kind: resizeMode === 'text' ? TransformHandleKind.Stretch : handleKind,
        vector: [xi * 2 - 1, 0],
        left: left + width * xi - sideHandleSize / 2,
        top,
        width: sideHandleSize,
        height,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursorKind: CursorKind.EW,
      })
    }

    // remove unused handles
    const { handles: currentHandles } = transformBoxEntity.read(TransformBox)
    const handleSet = new Map<string, TransformHandleDef>()
    for (const handle of handles) {
      handleSet.set(`${handle.kind}-${handle.vector[0]}-${handle.vector[1]}`, handle)
    }
    for (const handleEntity of currentHandles) {
      const handle = handleEntity.read(TransformHandle)
      const key = `${handle.kind}-${handle.vector[0]}-${handle.vector[1]}`
      if (!handleSet.has(key)) {
        this.deleteEntity(handleEntity)
      }
    }

    const M = newRotationMatrixAroundPoint(rotateZ, center)
    for (const handle of handles) {
      let handleEntity: Entity | undefined

      // find existing handle entity
      const handleEntities = transformBoxEntity.read(TransformBox).handles
      for (const entity of handleEntities) {
        const h = entity.read(TransformHandle)
        if (h.kind === handle.kind && h.vector[0] === handle.vector[0] && h.vector[1] === handle.vector[1]) {
          handleEntity = entity
          break
        }
      }

      // if no existing handle entity, create a new one
      if (!handleEntity) {
        handleEntity = this.createEntity(TransformHandle, Block, { id: crypto.randomUUID() }, DragStart)
      }

      const handleCenter: [number, number] = [handle.left + handle.width / 2, handle.top + handle.height / 2]
      const position = transformPoint(M, handleCenter)
      // const position = rotatePoint(handleCenter, center, rotateZ)
      const left = position[0] - handle.width / 2
      const top = position[1] - handle.height / 2

      Object.assign(handleEntity.write(TransformHandle), {
        kind: handle.kind,
        vector: handle.vector,
        transformBox: transformBoxEntity,
        cursorKind: handle.cursorKind,
      })

      Object.assign(handleEntity.write(Block), {
        left,
        top,
        tag: handle.tag,
        width: handle.width,
        height: handle.height,
        rotateZ: handle.rotateZ,
        rank: handle.rank,
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

  private hideTransformBox(transformBoxEntity: Entity | undefined = undefined): void {
    if (transformBoxEntity === undefined) {
      if (this.transformBoxes.current.length === 0) {
        console.warn('No transform box to hide')
        return
      }

      transformBoxEntity = this.transformBoxes.current[0]

      if (!transformBoxEntity) {
        console.warn('No transform box found to hide')
        return
      }
    }

    const transformBox = transformBoxEntity.read(TransformBox)
    for (const handleEntity of transformBox.handles) {
      if (!handleEntity.has(Opacity)) {
        handleEntity.add(Opacity)
      }

      const handleOpacity = handleEntity.write(Opacity)
      handleOpacity.value = 0
    }

    if (!transformBoxEntity.has(Opacity)) {
      transformBoxEntity.add(Opacity)
    }
    const boxOpacity = transformBoxEntity.write(Opacity)
    boxOpacity.value = 0
  }

  @co private *showTransformBox(): Generator {
    if (this.transformBoxes.current.length === 0) {
      console.warn('No transform box to show')
      return
    }

    // waiting 1 frame - this is to prevent flickering that occurs when
    // selection changes on the same frame as showTransformBox
    yield

    if (!this.transformBoxes.current[0]) return

    const transformBoxEntity = this.transformBoxes.current[0]

    // make sure the transform box hasn't been deleted in the meantime
    if (!transformBoxEntity.alive || transformBoxEntity.has(ToBeDeleted)) return

    if (transformBoxEntity.has(Locked)) return

    const transformBox = transformBoxEntity.read(TransformBox)
    for (const handleEntity of transformBox.handles) {
      if (handleEntity.has(Opacity)) {
        handleEntity.remove(Opacity)
      }
    }
    if (transformBoxEntity.has(Opacity)) {
      transformBoxEntity.remove(Opacity)
    }

    this.updateTransformBox()
  }

  private dragBlock(blockEntity: Entity, position: { left: number; top: number }): void {
    const block = blockEntity.write(Block)

    block.left = position.left
    block.top = position.top

    // if (block.connections.length) {
    //   // Update connection position
    //    for (const connEntity of block.connections) {
    //      const connection = connEntity.write(Connection)
    //      connection.position = [block.left, block.top]
    //    }
    // }

    if (blockEntity.has(TransformBox)) {
      this.onTransformBoxMove(blockEntity)
    } else if (blockEntity.has(TransformHandle)) {
      const handle = blockEntity.read(TransformHandle)
      const kind = handle.kind
      if (kind === TransformHandleKind.Rotate) {
        this.onRotateHandleMove(blockEntity)
      } else if (kind === TransformHandleKind.Scale || this.keyboard.shiftDown) {
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
    const boxCenter = boxEntity.read(Block).getCenter()

    const handleBlock = handleEntity.read(Block)
    const handleCenter = [handleBlock.left + handleBlock.width / 2, handleBlock.top + handleBlock.height / 2]
    const angleHandle = Math.atan2(handleCenter[1] - boxCenter[1], handleCenter[0] - boxCenter[0])

    const { vector } = handleEntity.read(TransformHandle)
    const boxBlock = boxEntity.read(Block)
    const handleStartAngle = Math.atan2(boxBlock.height * vector[1], boxBlock.width * vector[0]) + boxBlock.rotateZ

    const delta = angleHandle - handleStartAngle

    handleEntity.write(Block).rotateZ = (boxBlock.rotateZ + delta) % (2 * Math.PI)

    for (const blockEntity of this.selectedBlocks.current) {
      const { startLeft, startTop, startWidth, startHeight, startRotateZ } = blockEntity.read(DragStart)

      const block = blockEntity.write(Block)
      block.rotateZ = (startRotateZ + delta) % (2 * Math.PI)

      if (this.keyboard.shiftDown) {
        // snap to nearest 15 degrees
        block.rotateZ = Math.round(block.rotateZ / (Math.PI / 12)) * (Math.PI / 12)
      }

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

    const handleBlock = handleEntity.read(Block)
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

    const transformBox = boxEntity.read(TransformBox)
    const oppositeHandleEntity = transformBox.handles.find((h) => {
      const { vector, kind } = h.read(TransformHandle)
      return handleKind === kind && handleVec[0] === -vector[0] && handleVec[1] === -vector[1]
    })
    if (!oppositeHandleEntity) {
      console.error('No opposite handle found for', handleKind, handleVec)
      return
    }

    // remove other handles that are not the current handle or opposite handle
    for (const h of transformBox.handles) {
      if (!h.isSame(handleEntity) && !h.isSame(oppositeHandleEntity)) {
        this.deleteEntity(h)
      }
    }

    const oppositeHandleBlock = oppositeHandleEntity.read(Block)
    const oppositeCenter = oppositeHandleBlock.getCenter()
    let difference: [number, number] = [handleCenter[0] - oppositeCenter[0], handleCenter[1] - oppositeCenter[1]]
    const R0 = newRotationMatrix(-boxRotateZ)
    difference = transformPoint(R0, difference)

    let boxEndWidth = Math.max(Math.abs(difference[0]), 1)
    let boxEndHeight = Math.max(Math.abs(difference[1]), 1)

    // flip handle vectors when crossing over
    for (let i = 0; i < 2; i++) {
      if (Math.sign(difference[i]) !== handleVec[i]) {
        const handle = handleEntity.write(TransformHandle)
        handle.vector[i] = -handle.vector[i]

        const oppositeHandle = oppositeHandleEntity.write(TransformHandle)
        oppositeHandle.vector[i] = -oppositeHandle.vector[i]
      }
    }

    // if (difference[1] < 0) {
    //   const handle = handleEntity.write(TransformHandle)
    //   handle.vector[1] = -handle.vector[1]

    //   const oppositeHandle = oppositeHandleEntity.write(TransformHandle)
    //   oppositeHandle.vector[1] = -oppositeHandle.vector[1]
    // }

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
    const R1 = newRotationMatrix(boxRotateZ)
    const rotatedVector = transformPoint(R1, vec)

    const newBoxCenter = [oppositeCenter[0] + rotatedVector[0] / 2, oppositeCenter[1] + rotatedVector[1] / 2]

    const boxEndLeft = newBoxCenter[0] - boxEndWidth / 2
    const boxEndTop = newBoxCenter[1] - boxEndHeight / 2

    // TODO snapping

    for (const selectedEntity of this.selectedBlocks.current) {
      const { startLeft, startTop, startWidth, startHeight, startFontSize } = selectedEntity.read(DragStart)

      const block = selectedEntity.write(Block)

      block.left = (startLeft - boxStartLeft) * (boxEndWidth / boxStartWidth) + boxEndLeft
      block.top = (startTop - boxStartTop) * (boxEndHeight / boxStartHeight) + boxEndTop

      const endWidth = startWidth * (boxEndWidth / boxStartWidth)
      const endHeight = startHeight * (boxEndHeight / boxStartHeight)
      const endFontSize = startFontSize * (boxEndHeight / boxStartHeight)

      const blockDef = this.getBlockDef(block.tag)

      let didStretch = false
      if (maintainAspectRatio || blockDef?.resizeMode === 'free') {
        block.width = endWidth
        block.height = endHeight
      } else {
        if (handleVec[1] === 0) {
          block.width = endWidth
          didStretch = true
        } else if (handleVec[0] === 0) {
          block.height = endHeight
        }
      }

      // update text
      if (selectedEntity.has(Text) && ['scale', 'text'].includes(blockDef?.resizeMode ?? '')) {
        if (didStretch) {
          this.stretchTextEntity(selectedEntity)
        } else {
          // scale text font size
          selectedEntity.write(Text).fontSize = endFontSize
        }
      }
    }
  }

  private stretchTextEntity(textEntity: Entity): void {
    const block = textEntity.read(Block)
    const element = this.getBlockElementById(block.id)
    const root = element?.shadowRoot?.firstElementChild
    if (!root) return

    // go ahead and update the element size with the new block size
    // and ensure it has the same size as the shadow root
    element.style.width = `${block.width}px`
    element.style.height = `${block.height}px`

    const rect = root.getBoundingClientRect()

    if (rect.height !== block.height || rect.width !== block.width) {
      const writableBlock = textEntity.write(Block)
      writableBlock.height = rect.height
      writableBlock.width = rect.width
    }

    const text = textEntity.write(Text)
    text.constrainWidth = true
  }

  private onTransformBoxMove(transformBoxEntity: Entity): void {
    const boxStart = transformBoxEntity.read(DragStart)
    const transformBoxBlock = transformBoxEntity.read(Block)

    const dx = transformBoxBlock.left - boxStart.startLeft
    const dy = transformBoxBlock.top - boxStart.startTop

    for (const selectedBlock of this.selectedBlocks.current) {
      const blockStart = selectedBlock.read(DragStart)
      const block = selectedBlock.write(Block)
      block.left = blockStart.startLeft + dx
      block.top = blockStart.startTop + dy
    }
  }

  private startTransformBoxEdit(transformBoxEntity: Entity | undefined = undefined): void {
    if (transformBoxEntity === undefined) {
      if (this.transformBoxes.current.length === 0) {
        console.warn('No transform box to edit')
        return
      }

      transformBoxEntity = this.transformBoxes.current[0]

      if (!transformBoxEntity) {
        console.warn('No transform box found to edit')
        return
      }
    }

    this.setComponent(transformBoxEntity, Locked)

    const selectedBlocks = this.selectedBlocks.current.filter((e) => e.read(Selected).selectedBy === this.resources.uid)

    for (const blockEntity of selectedBlocks) {
      this.setComponent(blockEntity, Edited)
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
      if (blockEntity.has(Edited)) {
        blockEntity.remove(Edited)
      }
    }
  }

  public onZoom(): void {
    if (!this.transformBoxes.current.length) return
    this.addOrUpdateTransformHandles(this.transformBoxes.current[0])
  }
}
