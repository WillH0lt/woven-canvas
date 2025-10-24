import type { BaseResources } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { z } from 'zod/v4'

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

export enum ArrowKind {
  Arc = 'arc',
  Elbow = 'elbow',
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
  [ArrowCommand.AddArrow]: [Entity, [number, number], ArrowKind]
  [ArrowCommand.DrawArrow]: [Entity, [number, number], [number, number]]
  [ArrowCommand.RemoveArrow]: [Entity]
  [ArrowCommand.CompleteArrow]: [Entity]

  [ArrowCommand.AddTransformHandles]: [Entity]
  [ArrowCommand.RemoveTransformHandles]: []
  [ArrowCommand.HideTransformHandles]: []
  [ArrowCommand.ShowTransformHandles]: []
  [ArrowCommand.UpdateTransformHandles]: [Entity]
}

export const Options = z.object({
  elbowArrowPadding: z.number().min(0).default(50),
})

export type Options = z.infer<typeof Options>

export type OptionsInput = z.input<typeof Options>

export type ArrowResources = Options & BaseResources
