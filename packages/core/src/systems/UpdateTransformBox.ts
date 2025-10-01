import { type Entity, co } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import {
  Aabb,
  Block,
  Connector,
  DragStart,
  Edited,
  Locked,
  Opacity,
  ScaleWithZoom,
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
import { newRotationMatrixAroundPoint, transformPoint } from '../helpers'
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
    (q) => q.added.removed.current.with(Block, Selected).write.using(Text).write.using(Aabb, Connector).read,
  )

  private readonly editedBlocks = this.query((q) => q.current.with(Block, Edited).write)

  private readonly transformBoxes = this.query(
    (q) =>
      q.current.changed
        .with(TransformBox, Block)
        .write.trackWrites.using(TransformHandle, DragStart, Locked, Opacity, ScaleWithZoom).write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection, UpdateBlocks, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.AddOrUpdateTransformBox, this.addOrUpdateTransformBox.bind(this))
    this.addCommandListener(CoreCommand.UpdateTransformBox, this.updateTransformBox.bind(this))
    this.addCommandListener(CoreCommand.HideTransformBox, this.hideTransformBox.bind(this))
    this.addCommandListener(CoreCommand.ShowTransformBox, this.showTransformBox.bind(this))
    this.addCommandListener(CoreCommand.RemoveTransformBox, this.removeTransformBox.bind(this))
    this.addCommandListener(CoreCommand.StartTransformBoxEdit, this.startTransformBoxEdit.bind(this))
    this.addCommandListener(CoreCommand.EndTransformBoxEdit, this.endTransformBoxEdit.bind(this))
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
    const handleSize = 12
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
        handleEntity = this.createEntity(TransformHandle, Block, { id: crypto.randomUUID() }, DragStart, ScaleWithZoom)
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

      Object.assign(handleEntity.write(ScaleWithZoom), {
        startLeft: left,
        startTop: top,
        startWidth: handle.width,
        startHeight: handle.height,
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

  // public onZoom(): void {
  //   if (!this.transformBoxes.current.length) return
  //   this.addOrUpdateTransformHandles(this.transformBoxes.current[0])
  // }
}
