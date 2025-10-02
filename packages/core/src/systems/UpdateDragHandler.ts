import type { Entity } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import {
  Aabb,
  Block,
  Connector,
  DragStart,
  Persistent,
  Selected,
  Text,
  TransformBox,
  TransformHandle,
} from '../components'
import { newRotationMatrix, transformPoint } from '../helpers'
import { TransformHandleKind } from '../types'
import { UpdateBlocks } from './UpdateBlocks'
import { UpdateCamera } from './UpdateCamera'
import { UpdateSelection } from './UpdateSelection'
import { UpdateTransformBox } from './UpdateTransformBox'

export class UpdateDragHandler extends BaseSystem<CoreCommandArgs> {
  private readonly selectedBlocks = this.query(
    (q) =>
      q.added.removed.current.with(Block).write.and.with(Selected).using(Text, Connector).write.using(Aabb, Persistent)
        .read,
  )

  private readonly transformBoxes = this.query(
    (q) => q.current.changed.with(TransformBox, Block).trackWrites.using(DragStart, TransformHandle).write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection, UpdateBlocks, UpdateCamera, UpdateTransformBox))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.DragBlock, this.dragBlock.bind(this))
  }

  private dragBlock(blockEntity: Entity, position: { left: number; top: number }): void {
    const block = blockEntity.write(Block)
    block.left = position.left
    block.top = position.top

    if (this.grid.enabled && blockEntity.hasSomeOf(Persistent, TransformBox)) {
      block.left = Math.round(block.left / this.grid.xSpacing) * this.grid.xSpacing
      block.top = Math.round(block.top / this.grid.ySpacing) * this.grid.ySpacing
    }

    this._markConnectorsForUpdate(blockEntity)

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

    let delta = angleHandle - handleStartAngle
    if (this.keyboard.shiftDown) {
      // snap to nearest 15 degrees
      const snapAngle = Math.PI / 12
      const offset = boxBlock.rotateZ % snapAngle
      delta = Math.round(delta / snapAngle) * snapAngle - offset
    }

    // signal to the cursorIcon to rotate
    handleEntity.write(Block).rotateZ = delta

    for (const blockEntity of this.selectedBlocks.current) {
      if (!this._canBeMoved(blockEntity, this.selectedBlocks.current)) continue

      const { startLeft, startTop, startWidth, startHeight, startRotateZ } = blockEntity.read(DragStart)
      const block = blockEntity.write(Block)

      block.rotateZ = (startRotateZ + delta) % (2 * Math.PI)
      const startCenter = [startLeft + startWidth / 2, startTop + startHeight / 2]

      const r = Math.hypot(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0])
      const angle = Math.atan2(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0]) + delta
      block.left = boxCenter[0] + Math.cos(angle) * r - block.width / 2
      block.top = boxCenter[1] + Math.sin(angle) * r - block.height / 2

      this._markConnectorsForUpdate(blockEntity)
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

    if (this.grid.enabled) {
      handleCenter[0] = Math.round(handleCenter[0] / this.grid.xSpacing) * this.grid.xSpacing
      handleCenter[1] = Math.round(handleCenter[1] / this.grid.ySpacing) * this.grid.ySpacing
    }

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
      if (!this._canBeMoved(selectedEntity, this.selectedBlocks.current)) continue

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

      this._markConnectorsForUpdate(selectedEntity)
    }
  }

  private stretchTextEntity(textEntity: Entity): void {
    const block = textEntity.write(Block)
    const element = this.getBlockElementById(block.id)
    const root = element?.shadowRoot?.firstElementChild
    if (!root) return

    // go ahead and update the element size with the new block size
    // and ensure it has the same size as the shadow root
    element.style.width = `${block.width}px`
    element.style.height = `${block.height}px`

    // Use offsetWidth/offsetHeight instead of getBoundingClientRect()
    // to get the actual layout dimensions without viewport/transform effects
    const actualWidth = (root as HTMLElement).offsetWidth
    const actualHeight = (root as HTMLElement).offsetHeight

    block.width = actualWidth
    block.height = actualHeight

    const text = textEntity.write(Text)
    text.constrainWidth = true
  }

  private onTransformBoxMove(transformBoxEntity: Entity): void {
    const boxStart = transformBoxEntity.read(DragStart)
    const transformBoxBlock = transformBoxEntity.read(Block)

    const dx = transformBoxBlock.left - boxStart.startLeft
    const dy = transformBoxBlock.top - boxStart.startTop

    for (const blockEntity of this.selectedBlocks.current) {
      if (!this._canBeMoved(blockEntity, this.selectedBlocks.current)) continue

      const blockStart = blockEntity.read(DragStart)
      const block = blockEntity.write(Block)
      block.left = blockStart.startLeft + dx
      block.top = blockStart.startTop + dy

      this._markConnectorsForUpdate(blockEntity)
    }
  }

  private _canBeMoved(blockEntity: Entity, otherMovedEntities: readonly Entity[]): boolean {
    if (!blockEntity.has(Connector)) return true
    const connector = blockEntity.read(Connector)

    if (connector.startBlockEntity) {
      const movingStartBlock = otherMovedEntities.some((e) => e.isSame(connector.startBlockEntity!))
      if (!movingStartBlock) return false
    }

    if (connector.endBlockEntity) {
      const movingEndBlock = otherMovedEntities.some((e) => e.isSame(connector.endBlockEntity!))
      if (!movingEndBlock) return false
    }

    return true
  }

  private _markConnectorsForUpdate(blockEntity: Entity): void {
    const block = blockEntity.read(Block)
    for (const connectorEntity of block.connectors) {
      const connector = connectorEntity.write(Connector)
      if (connector.startBlockEntity?.isSame(blockEntity)) connector.startNeedsUpdate = true
      if (connector.endBlockEntity?.isSame(blockEntity)) connector.endNeedsUpdate = true
    }
  }
}
