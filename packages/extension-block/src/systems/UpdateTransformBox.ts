import { BaseSystem, comps as coreComps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import * as blockComps from '../components'
import {
  TRANSFORM_BOX_RANK,
  TRANSFORM_HANDLE_CORNER_RANK,
  TRANSFORM_HANDLE_EDGE_RANK,
  TRANSFORM_HANDLE_ROTATE_RANK,
} from '../constants'
import { computeAabb, computeCenter } from '../helpers'
import { BlockCommand, type BlockCommandArgs, TransformHandleKind } from '../types'
import { UpdateSelection } from './UpdateSelection'

const comps = {
  ...coreComps,
  ...blockComps,
}

interface TransformHandleDef {
  // tag: keyof typeof Tag
  kind: TransformHandleKind
  left: number
  top: number
  width: number
  height: number
  // rank: string
  // cursorKind: CursorKind
}

export class UpdateTransformBox extends BaseSystem<BlockCommandArgs> {
  private readonly selectedBlocks = this.query((q) => q.added.removed.current.with(comps.Block, comps.Selected).write)

  private readonly transformBoxes = this.query(
    (q) => q.current.with(comps.Block, comps.TransformBox, comps.Draggable).write.using(comps.TransformHandle).write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection))
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.UpdateBlockPosition, this.onBlockMove.bind(this))
  }

  public execute(): void {
    this.executeCommands()

    if (this.selectedBlocks.added.length || this.selectedBlocks.removed.length) {
      if (this.selectedBlocks.current.length === 0) {
        this.removeTransformBox()
      } else {
        this.addTransformBox()
      }
    }
  }

  private removeTransformBox(): void {
    // remove transform box if no blocks are selected

    for (const transformBoxEntity of this.transformBoxes.current) {
      const transformBox = transformBoxEntity.read(comps.TransformBox)
      this.deleteEntities(transformBox.handles)
    }
    this.deleteEntities(this.transformBoxes.current)
  }

  private addTransformBox(): void {
    // get or create a transform box entity
    let transformBoxEntity: Entity
    if (this.transformBoxes.current.length === 0) {
      transformBoxEntity = this.createTransformBox()
    } else {
      transformBoxEntity = this.transformBoxes.current[0]
    }

    // size the transform box to selected blocks
    const aabb = computeAabb(this.selectedBlocks.current)
    const block = transformBoxEntity.write(comps.Block)
    block.left = aabb.left
    block.top = aabb.top
    block.width = aabb.right - aabb.left
    block.height = aabb.bottom - aabb.top

    // set the initial size of the transform box
    const transformBox = transformBoxEntity.write(comps.TransformBox)
    transformBox.startLeft = block.left
    transformBox.startTop = block.top
    transformBox.startWidth = block.width
    transformBox.startHeight = block.height
    transformBox.startRotateZ = block.rotateZ

    this.updateTransformBoxHandles(transformBoxEntity)
  }

  private onBlockMove(blockEntity: Entity, position: { left: number; top: number }): void {
    if (blockEntity.has(comps.TransformBox)) {
      this.onTransformBoxMove(blockEntity, position)
    } else if (blockEntity.has(comps.TransformHandle)) {
      const handle = blockEntity.read(comps.TransformHandle)
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
    const { width, height } = boxEntity.read(comps.Block)

    const boxCenter = computeCenter(boxEntity)
    const handleCenter = computeCenter(handleEntity)

    const angleHandle = Math.atan2(handleCenter[1] - boxCenter[1], handleCenter[0] - boxCenter[0])

    const { kind } = handleEntity.read(comps.TransformHandle)
    const vec = getTransformHandleVector(kind)
    const handleStartAngle = Math.atan2(height * vec[1], width * vec[0])

    const delta = angleHandle - handleStartAngle

    // const { rotateZ } = boxEntity.read(comps.Block)
    // if (!this.input.modDown) {
    //   const shift = this.updateRotationSnapLines(rotateZ + delta, boxEntity);
    //   delta += shift;
    // }

    // boxEntity.write(comps.Block).rotateZ = (start + delta) % (2 * Math.PI)

    for (const blockEntity of this.selectedBlocks.current) {
      const startRotateZ = blockEntity.read(comps.Selected).startRotateZ

      const block = blockEntity.write(comps.Block)
      block.rotateZ = (startRotateZ + delta) % (2 * Math.PI)

      const { startLeft, startTop, startWidth, startHeight } = blockEntity.read(comps.Selected)
      const startCenter = [startLeft + startWidth / 2, startTop + startHeight / 2]

      const r = Math.hypot(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0])
      const angle = Math.atan2(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0]) + delta
      block.left = boxCenter[0] + Math.cos(angle) * r - block.width / 2
      block.top = boxCenter[1] + Math.sin(angle) * r - block.height / 2
    }

    // this.cursors.current[0].write(comps.Cursor)
  }

  private onScaleHandleMove(handleEntity: Entity, position: { left: number; top: number }): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found')
      return
    }

    const handleBlock = handleEntity.write(comps.Block)
    handleBlock.left = position.left
    handleBlock.top = position.top

    const boxEntity = this.transformBoxes.current[0]
    // const boxRotateZ = boxEntity.read(comps.Part).rotateZ;

    const transformBox = boxEntity.read(comps.TransformBox)
    const boxStartLeft = transformBox.startLeft
    const boxStartTop = transformBox.startTop
    const boxStartWidth = transformBox.startWidth
    const boxStartHeight = transformBox.startHeight

    const aspectRatio = boxStartWidth / boxStartHeight

    // get the position of the opposite handle of the transform box
    const handleKind = handleEntity.read(comps.TransformHandle).kind
    const oppositeKind = getOppositeTransformHandleKind(handleKind)
    const oppositeHandle = boxEntity
      .read(comps.TransformBox)
      .handles.find((h) => h.read(comps.TransformHandle).kind === oppositeKind)!
    const oppositeBlock = oppositeHandle.read(comps.Block)
    const oppositeCenter = [oppositeBlock.left + oppositeBlock.width / 2, oppositeBlock.top + oppositeBlock.height / 2]

    const difference: [number, number] = [position.left - oppositeBlock.left, position.top - oppositeBlock.top]
    // difference = rotatePoint(difference, [0, 0], -boxRotateZ)

    let boxEndWidth = Math.max(Math.abs(difference[0]), 10)
    let boxEndHeight = Math.max(Math.abs(difference[1]), 10)

    // const isStretchingX = [TransformHandleKind.LeftStretch, TransformHandleKind.RightStretch].includes(handleKind)
    // const isStretchingY = [TransformHandleKind.TopStretch, TransformHandleKind.BottomStretch].includes(handleKind)

    // let aspectLocked = true

    // if (this.selectedBlocks.current.length === 1) {
    //   const blockPart = this.selectedBlocks.current[0].read(comps.Part)
    //   aspectLocked = blockPart.aspectLocked
    // }

    // if (isStretchingX) {
    //   boxEndHeight = boxStartHeight
    // } else if (isStretchingY) {
    //   boxEndWidth = boxStartWidth
    // } else if (aspectLocked) {
    const newAspectRatio = boxEndWidth / boxEndHeight
    if (newAspectRatio > aspectRatio) {
      boxEndHeight = boxEndWidth / aspectRatio
    } else {
      boxEndWidth = boxEndHeight * aspectRatio
    }

    // } else {
    //   const isChangingHeight = [TransformHandleKind.TopScale, TransformHandleKind.BottomScale].includes(handleKind)
    //   const isChangingWidth = [TransformHandleKind.LeftScale, TransformHandleKind.RightScale].includes(handleKind)
    //   if (isChangingHeight) {
    //     boxEndWidth = boxStartWidth
    //   } else if (isChangingWidth) {
    //     boxEndHeight = boxStartHeight
    //   }
    // }

    const handleVec = getTransformHandleVector(handleKind)
    handleVec[0] *= boxEndWidth
    handleVec[1] *= boxEndHeight

    // handleVec = rotatePoint(handleVec, [0, 0], boxRotateZ)
    // handleVec[0] += oppositeCenter[0]
    // handleVec[1] += oppositeCenter[1]

    const newBoxCenter = [oppositeCenter[0] + handleVec[0] / 2, oppositeCenter[1] + handleVec[1] / 2]

    const boxEndLeft = newBoxCenter[0] - boxEndWidth / 2
    const boxEndTop = newBoxCenter[1] - boxEndHeight / 2

    const boxBlock = boxEntity.write(comps.Block)
    boxBlock.left = boxEndLeft
    boxBlock.top = boxEndTop
    boxBlock.width = boxEndWidth
    boxBlock.height = boxEndHeight

    // TODO scale snapping

    for (const selectedEntity of this.selectedBlocks.current) {
      const selected = selectedEntity.read(comps.Selected)

      const block = selectedEntity.write(comps.Block)

      block.left = (selected.startLeft - boxStartLeft) * (boxEndWidth / boxStartWidth) + boxEndLeft
      block.top = (selected.startTop - boxStartTop) * (boxEndHeight / boxStartHeight) + boxEndTop

      // if (!isStretchingY) {
      block.width = selected.startWidth * (boxEndWidth / boxStartWidth)
      // }
      // if (!isStretchingX) {
      block.height = selected.startHeight * (boxEndHeight / boxStartHeight)
      // block.fontSize = selected.startFontSize * (boxEndHeight / boxStartHeight)
      // }
      // if (isStretchingY || isStretchingX) {
      //   block.stretched = true
      // }
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

  private createTransformBox(): Entity {
    const id = crypto.randomUUID()
    const transformBoxEntity = this.createEntity(
      comps.Block,
      { id, blue: 255, alpha: 128, rank: TRANSFORM_BOX_RANK },
      comps.TransformBox,
      comps.Draggable,
    )

    this.createTransformHandles(transformBoxEntity)

    return transformBoxEntity
  }

  private createTransformHandles(transformBoxEntity: Entity): Entity[] {
    const kinds = [
      TransformHandleKind.TopLeftScale,
      TransformHandleKind.BottomRightScale,
      TransformHandleKind.TopRightScale,
      TransformHandleKind.BottomLeftScale,
      TransformHandleKind.TopLeftRotate,
      TransformHandleKind.TopRightRotate,
      TransformHandleKind.BottomLeftRotate,
      TransformHandleKind.BottomRightRotate,
    ]

    // const stretchableX = selectedBlocks.length === 1 && isStretchableX(selectedBlocks[0])
    // if (stretchableX) {
    //   kinds.push(TransformHandleKind.LeftStretch, TransformHandleKind.RightStretch)
    // } else {
    kinds.push(TransformHandleKind.LeftScale, TransformHandleKind.RightScale)
    // }

    // const stretchableY = selectedBlocks.length === 1 && isStretchableY(selectedBlocks[0])
    // if (stretchableY) {
    //   kinds.push(TransformHandleKind.TopStretch, TransformHandleKind.BottomStretch)
    // } else {
    kinds.push(TransformHandleKind.TopScale, TransformHandleKind.BottomScale)
    // }

    const transformHandleEntities = kinds.map((kind) =>
      this.createEntity(
        comps.TransformHandle,
        {
          kind,
          transformBox: transformBoxEntity,
        },
        comps.Block,
        {
          id: crypto.randomUUID(),
          alpha: 128,
          red: 255,
          rank: TRANSFORM_HANDLE_RANKS[kind],
          // visible: false,
          // opacity: 0,
          // layer: LayerKind.Selection,
        },
        // comps.Aabb,
        comps.Draggable,
        // comps.Hoverable,
      ),
    )

    // updateTransformBoxHandles(transformBoxEntity, transformHandleEntities)

    return transformHandleEntities
  }

  private updateTransformBoxHandles(transformBoxEntity: Entity): void {
    const transformBoxBlock = transformBoxEntity.read(comps.Block)
    // const rotateZ = transformBoxBlock.rotateZ
    const { left, top, width, height } = transformBoxBlock
    const handleSize = 15
    const rotationHandleSize = 2 * handleSize
    const sideHandleSize = 2 * handleSize

    const handles: TransformHandleDef[] = []

    const scaleKinds = [
      TransformHandleKind.TopLeftScale,
      TransformHandleKind.BottomLeftScale,
      TransformHandleKind.TopRightScale,
      TransformHandleKind.BottomRightScale,
    ]

    const rotateKinds = [
      TransformHandleKind.TopLeftRotate,
      TransformHandleKind.TopRightRotate,
      TransformHandleKind.BottomLeftRotate,
      TransformHandleKind.BottomRightRotate,
    ]

    // const rotateCursorKinds = [CursorKind.NW, CursorKind.NE, CursorKind.SW, CursorKind.SE]

    // corners
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        handles.push({
          // tag: Tag.TransformHandle,
          kind: scaleKinds[xi + yi * 2],
          left: left + width * xi - handleSize / 2,
          top: top + height * yi - handleSize / 2,
          width: handleSize,
          height: handleSize,
          // rank: TRANSFORM_HANDLE_CORNER_RANK,
          // cursorKind: xi + yi === 1 ? CursorKind.NESW : CursorKind.NWSE,
        })

        handles.push({
          // tag: Tag.Invisible,
          kind: rotateKinds[xi + yi * 2],
          left: left - rotationHandleSize + handleSize / 2 + xi * (width + rotationHandleSize - handleSize),
          top: top - rotationHandleSize + handleSize / 2 + yi * (height + rotationHandleSize - handleSize),
          width: rotationHandleSize,
          height: rotationHandleSize,
          // rank: ROTATE_HANDLE_RANK,
          // cursorKind: rotateCursorKinds[xi + yi * 2],
        })
      }
    }

    // top & bottom edges
    // const stretchableY = selectedBlocks.length === 1 && isStretchableY(selectedBlocks[0])
    for (let yi = 0; yi < 2; yi++) {
      let kind = TransformHandleKind.LeftScale
      // if (stretchableY) {
      //   kind = yi === 0 ? TransformHandleKind.TopStretch : TransformHandleKind.BottomStretch
      // } else {
      kind = yi === 0 ? TransformHandleKind.TopScale : TransformHandleKind.BottomScale
      // }

      handles.push({
        // tag: Tag.Invisible,
        kind,
        left,
        top: top + height * yi - sideHandleSize / 2,
        width,
        height: sideHandleSize,
        // rank: TRANSFORM_HANDLE_EDGE_RANK,
        // cursorKind: CursorKind.NS,
      })
    }

    // left & right edges
    // const stretchableX = selectedBlocks.length === 1 && isStretchableX(selectedBlocks[0])
    for (let xi = 0; xi < 2; xi++) {
      let kind = TransformHandleKind.LeftScale
      // if (stretchableX) {
      // kind = xi === 0 ? TransformHandleKind.LeftStretch : TransformHandleKind.RightStretch
      // } else {
      kind = xi === 0 ? TransformHandleKind.LeftScale : TransformHandleKind.RightScale
      // }

      handles.push({
        // tag: Tag.Invisible,
        kind,
        left: left + width * xi - sideHandleSize / 2,
        top,
        width: sideHandleSize,
        height,
        // rank: TRANSFORM_HANDLE_EDGE_RANK,
        // cursorKind: CursorKind.EW,
      })
    }

    // const center = getCenter(transformBoxEntity)
    // const center = [
    //   transformBoxBlock.left + transformBoxBlock.width / 2,
    //   transformBoxBlock.top + transformBoxBlock.height / 2,
    // ]

    const transformBox = transformBoxEntity.read(comps.TransformBox)

    for (const handleEntity of transformBox.handles) {
      const { kind } = handleEntity.write(comps.TransformHandle)

      const handle = handles.find((h) => h.kind === kind)
      if (!handle) {
        console.warn('No handle found')
        continue
        // throw new Error('No handle found');
      }

      const handleCenter: [number, number] = [handle.left + handle.width / 2, handle.top + handle.height / 2]
      // const position = rotatePoint(handleCenter, center, rotateZ)

      const block = handleEntity.write(comps.Block)
      // part.tag = handle.tag
      block.left = handleCenter[0] - handle.width / 2
      block.top = handleCenter[1] - handle.height / 2
      block.width = handle.width
      block.height = handle.height
      // part.rotateZ = rotateZ
      // part.rank = handle.rank

      // const hoverable = handleEntity.write(comps.Hoverable)
      // hoverable.cursorKind = handle.cursorKind
    }
  }
}

export function getOppositeTransformHandleKind(kind: TransformHandleKind): TransformHandleKind {
  const opposites: Partial<Record<TransformHandleKind, TransformHandleKind>> = {
    [TransformHandleKind.TopLeftScale]: TransformHandleKind.BottomRightScale,
    [TransformHandleKind.TopRightScale]: TransformHandleKind.BottomLeftScale,
    [TransformHandleKind.BottomLeftScale]: TransformHandleKind.TopRightScale,
    [TransformHandleKind.BottomRightScale]: TransformHandleKind.TopLeftScale,
    [TransformHandleKind.TopScale]: TransformHandleKind.BottomScale,
    [TransformHandleKind.RightScale]: TransformHandleKind.LeftScale,
    [TransformHandleKind.BottomScale]: TransformHandleKind.TopScale,
    [TransformHandleKind.LeftScale]: TransformHandleKind.RightScale,
    [TransformHandleKind.LeftStretch]: TransformHandleKind.RightStretch,
    [TransformHandleKind.RightStretch]: TransformHandleKind.LeftStretch,
    [TransformHandleKind.TopStretch]: TransformHandleKind.BottomStretch,
    [TransformHandleKind.BottomStretch]: TransformHandleKind.TopStretch,
  }
  return opposites[kind] ?? kind
}

const TRANSFORM_HANDLE_RANKS: Record<TransformHandleKind, string> = {
  [TransformHandleKind.TopLeftScale]: TRANSFORM_HANDLE_CORNER_RANK,
  [TransformHandleKind.BottomRightScale]: TRANSFORM_HANDLE_CORNER_RANK,
  [TransformHandleKind.TopRightScale]: TRANSFORM_HANDLE_CORNER_RANK,
  [TransformHandleKind.BottomLeftScale]: TRANSFORM_HANDLE_CORNER_RANK,
  [TransformHandleKind.TopLeftRotate]: TRANSFORM_HANDLE_ROTATE_RANK,
  [TransformHandleKind.TopRightRotate]: TRANSFORM_HANDLE_ROTATE_RANK,
  [TransformHandleKind.BottomLeftRotate]: TRANSFORM_HANDLE_ROTATE_RANK,
  [TransformHandleKind.BottomRightRotate]: TRANSFORM_HANDLE_ROTATE_RANK,
  [TransformHandleKind.TopScale]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.RightScale]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.BottomScale]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.LeftScale]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.LeftStretch]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.RightStretch]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.TopStretch]: TRANSFORM_HANDLE_EDGE_RANK,
  [TransformHandleKind.BottomStretch]: TRANSFORM_HANDLE_EDGE_RANK,
}

function getTransformHandleVector(kind: TransformHandleKind): [number, number] {
  switch (kind) {
    case TransformHandleKind.TopLeftScale:
      return [-1, -1]
    case TransformHandleKind.TopRightScale:
      return [-1, 1]
    case TransformHandleKind.BottomLeftScale:
      return [1, -1]
    case TransformHandleKind.BottomRightScale:
      return [1, 1]
    case TransformHandleKind.TopScale:
      return [0, -1]
    case TransformHandleKind.RightScale:
      return [1, 0]
    case TransformHandleKind.BottomScale:
      return [0, 1]
    case TransformHandleKind.LeftScale:
      return [-1, 0]
    case TransformHandleKind.LeftStretch:
      return [-1, 0]
    case TransformHandleKind.RightStretch:
      return [1, 0]
    case TransformHandleKind.TopStretch:
      return [0, -1]
    case TransformHandleKind.BottomStretch:
      return [0, 1]
    case TransformHandleKind.TopLeftRotate:
      return [-1, -1]
    case TransformHandleKind.TopRightRotate:
      return [1, -1]
    case TransformHandleKind.BottomLeftRotate:
      return [-1, 1]
    case TransformHandleKind.BottomRightRotate:
      return [1, 1]
    default:
      return [0, 0]
  }
}
