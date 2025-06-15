import type { BlockModel } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export enum Selection {
  Idle = 'idle',
  Pointing = 'pointing',
  Dragging = 'dragging',
  SelectionBoxPointing = 'selectionBoxPointing',
  SelectionBoxDragging = 'selectionBoxDragging',
}

export interface SelectBlockOptions {
  deselectOthers?: boolean
}

export interface AabbModel {
  left: number
  right: number
  top: number
  bottom: number
}

export enum TransformHandleKind {
  TopRightScale = 'top-right-scale',
  BottomRightScale = 'bottom-right-scale',
  BottomLeftScale = 'bottom-left-scale',
  TopLeftScale = 'top-left-scale',
  TopScale = 'top-scale',
  RightScale = 'right-scale',
  BottomScale = 'bottom-scale',
  LeftScale = 'left-scale',
  RightStretch = 'right-stretch',
  LeftStretch = 'left-stretch',
  TopStretch = 'top-stretch',
  BottomStretch = 'bottom-stretch',
  TopLeftRotate = 'top-left-rotate',
  TopRightRotate = 'top-right-rotate',
  BottomRightRotate = 'bottom-right-rotate',
  BottomLeftRotate = 'bottom-left-rotate',

  // Scale = 'scale',
  // Stretch = 'stretch',
  // Rotate = 'rotate',
}

export enum BlockCommand {
  AddBlock = 'addBlock',
  UpdateBlockPosition = 'updateBlockPosition',
  RemoveBlock = 'removeBlock',

  AddSelectionBox = 'addSelectionBox',
  UpdateSelectionBox = 'updateSelectionBox',
  RemoveSelectionBoxes = 'removeSelectionBoxes',

  SelectBlock = 'selectBlock',
  DeselectBlock = 'deselectBlock',
  DeselectAll = 'deselectAll',
  RemoveSelected = 'removeSelected',
}

export type BlockCommandArgs = {
  [BlockCommand.AddBlock]: [Partial<BlockModel>]
  [BlockCommand.UpdateBlockPosition]: [
    Entity,
    {
      left: number
      top: number
    },
  ]
  [BlockCommand.RemoveBlock]: [Entity]

  [BlockCommand.AddSelectionBox]: [Partial<BlockModel>]
  [BlockCommand.UpdateSelectionBox]: [Partial<BlockModel>]
  [BlockCommand.RemoveSelectionBoxes]: []

  [BlockCommand.SelectBlock]: [Entity, SelectBlockOptions]
  [BlockCommand.DeselectBlock]: [Entity]
  [BlockCommand.DeselectAll]: []
  [BlockCommand.RemoveSelected]: []
}
