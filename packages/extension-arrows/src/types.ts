import type { Entity } from '@lastolivegames/becsy'

export enum ArrowDrawState {
  Idle = 'idle',
  Pointing = 'pointing',
  Dragging = 'dragging',
}

export enum ArrowTransformState {
  None = 'none',
  Idle = 'idle',
  Editing = 'editing',
  // Pointing = 'pointing',
  // Dragging = 'dragging',
}

export enum ArrowHandleKind {
  Start = 'start',
  Middle = 'middle',
  End = 'end',
}

export enum ArrowCommand {
  AddArrow = 'arrowsAddArrow',
  DragArrow = 'arrowsDragArrow',
  CompleteArrow = 'arrowsCompleteArrow',
  RemoveArrow = 'arrowsRemoveArrow',

  AddTransformHandles = 'arrowsAddTransformHandles',
  RemoveTransformHandles = 'arrowsRemoveTransformHandles',
  HideTransformHandles = 'arrowsHideTransformHandles',
  ShowTransformHandles = 'arrowsShowTransformHandles',
  UpdateTransformHandles = 'arrowsUpdateTransformHandles',
}

export type ArrowCommandArgs = {
  [ArrowCommand.AddArrow]: [Entity, [number, number]]
  [ArrowCommand.DragArrow]: [Entity, [number, number], [number, number]]
  [ArrowCommand.RemoveArrow]: [Entity]
  [ArrowCommand.CompleteArrow]: [Entity]

  [ArrowCommand.AddTransformHandles]: [Entity]
  [ArrowCommand.RemoveTransformHandles]: []
  [ArrowCommand.HideTransformHandles]: []
  [ArrowCommand.ShowTransformHandles]: []
  [ArrowCommand.UpdateTransformHandles]: [Entity]
}
