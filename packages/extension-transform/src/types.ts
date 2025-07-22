import type { BlockModel } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export enum SelectionState {
  Idle = 'idle',
  Pointing = 'pointing',
  Dragging = 'dragging',
  SelectionBoxPointing = 'selectionBoxPointing',
  SelectionBoxDragging = 'selectionBoxDragging',
}

export enum TransformBoxState {
  None = 'none',
  Idle = 'idle',
  Editing = 'editing',
}

export interface SelectBlockOptions {
  deselectOthers?: boolean
}

export enum TransformCommand {
  AddSelectionBox = 'addSelectionBox',
  UpdateSelectionBox = 'updateSelectionBox',
  RemoveSelectionBox = 'removeSelectionBox',

  SelectBlock = 'selectBlock',
  DeselectBlock = 'deselectBlock',
  DeselectAll = 'deselectAll',

  AddTransformBox = 'addTransformBox',
  UpdateTransformBox = 'updateTransformBox',
  HideTransformBox = 'hideTransformBox',
  ShowTransformBox = 'showTransformBox',
  RemoveTransformBox = 'removeTransformBox',
  StartTransformBoxEdit = 'startTransformBoxEdit',
  EndTransformBoxEdit = 'endTransformBoxEdit',
}

export type TransformCommandArgs = {
  [TransformCommand.AddSelectionBox]: []
  [TransformCommand.UpdateSelectionBox]: [Partial<BlockModel>]
  [TransformCommand.RemoveSelectionBox]: []

  [TransformCommand.SelectBlock]: [
    Entity,
    {
      options: SelectBlockOptions
    },
  ]
  [TransformCommand.DeselectBlock]: [Entity]
  [TransformCommand.DeselectAll]: []

  [TransformCommand.AddTransformBox]: []
  [TransformCommand.UpdateTransformBox]: []
  [TransformCommand.HideTransformBox]: []
  [TransformCommand.ShowTransformBox]: []
  [TransformCommand.RemoveTransformBox]: []
  [TransformCommand.StartTransformBoxEdit]: []
  [TransformCommand.EndTransformBoxEdit]: []
}

export enum TransformHandleKind {
  Scale = 'scale',
  Stretch = 'stretch',
  Rotate = 'rotate',
}
