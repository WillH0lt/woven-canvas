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
export type TransformResources = BaseResources & z.Infer<typeof TransformOptions>

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

  DragBlock = 'dragBlock',
}

export type TransformCommandArgs = {
  [TransformCommand.AddSelectionBox]: []
  [TransformCommand.UpdateSelectionBox]: [Partial<Block>]
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
