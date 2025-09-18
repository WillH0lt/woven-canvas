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
}

export enum ArrowHandleKind {
  Start = 'start',
  Middle = 'middle',
  End = 'end',
}

export enum ArrowHeadKind {
  None = 'none',
  V = 'v',
}

export enum ArrowCommand {
  AddArrow = 'arrowsAddArrow',
  DrawArrow = 'arrowsDrawArrow',
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
  [ArrowCommand.DrawArrow]: [Entity, [number, number], [number, number]]
  [ArrowCommand.RemoveArrow]: [Entity]
  [ArrowCommand.CompleteArrow]: [Entity]

  [ArrowCommand.AddTransformHandles]: [Entity]
  [ArrowCommand.RemoveTransformHandles]: []
  [ArrowCommand.HideTransformHandles]: []
  [ArrowCommand.ShowTransformHandles]: []
  [ArrowCommand.UpdateTransformHandles]: [Entity]
}
