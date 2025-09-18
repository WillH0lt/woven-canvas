import type { Entity } from '@lastolivegames/becsy'

export enum StrokeState {
  Idle = 'idle',
  Drawing = 'drawing',
}

export enum InkCommand {
  AddStroke = 'inkAddStroke',
  AddStrokePoint = 'inkAddStrokePoint',
  CompleteStroke = 'inkCompleteStroke',
  RemoveStroke = 'inkRemoveStroke',
}

export type InkCommandArgs = {
  [InkCommand.AddStroke]: [Entity, [number, number], number | null]
  [InkCommand.AddStrokePoint]: [Entity, [number, number], number | null]
  [InkCommand.RemoveStroke]: [Entity]
  [InkCommand.CompleteStroke]: [Entity]
}
