import type { BaseResources } from '@infinitecanvas/core'
import type { Block } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import { z } from 'zod/v4'

export const TransformOptions = z.object({
  transformBoxTag: z.string().default('ic-transform-box'),
  transformHandleTag: z.string().default('ic-transform-box-handle'),
  selectionBoxTag: z.string().default('ic-selection-box'),
})

export type TransformOptionsInput = z.input<typeof TransformOptions>
export type TransformOptions = z.infer<typeof TransformOptions>

export type TransformResources = BaseResources & TransformOptions

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

export enum TransformCommand {
  AddSelectionBox = 'transformAddSelectionBox',
  UpdateSelectionBox = 'transformUpdateSelectionBox',
  RemoveSelectionBox = 'transformRemoveSelectionBox',

  AddTransformBox = 'transformAddTransformBox',
  UpdateTransformBox = 'transformUpdateTransformBox',
  HideTransformBox = 'transformHideTransformBox',
  ShowTransformBox = 'transformShowTransformBox',
  RemoveTransformBox = 'transformRemoveTransformBox',
  StartTransformBoxEdit = 'transformStartTransformBoxEdit',
  EndTransformBoxEdit = 'transformEndTransformBoxEdit',

  DragBlock = 'transformDragBlock',
}

export type TransformCommandArgs = {
  [TransformCommand.AddSelectionBox]: []
  [TransformCommand.UpdateSelectionBox]: [Partial<Block>]
  [TransformCommand.RemoveSelectionBox]: []

  [TransformCommand.AddTransformBox]: []
  [TransformCommand.UpdateTransformBox]: []
  [TransformCommand.HideTransformBox]: []
  [TransformCommand.ShowTransformBox]: []
  [TransformCommand.RemoveTransformBox]: []
  [TransformCommand.StartTransformBoxEdit]: []
  [TransformCommand.EndTransformBoxEdit]: []

  [TransformCommand.DragBlock]: [
    Entity,
    {
      left: number
      top: number
    },
  ]
}

export enum TransformHandleKind {
  Scale = 'scale',
  Stretch = 'stretch',
  Rotate = 'rotate',
}

export enum CursorKind {
  Drag = 'drag',
  NESW = 'nesw',
  NWSE = 'nwse',
  NS = 'ns',
  EW = 'ew',
  RotateNW = 'rotateNW',
  RotateNE = 'rotateNE',
  RotateSW = 'rotateSW',
  RotateSE = 'rotateSE',
}
