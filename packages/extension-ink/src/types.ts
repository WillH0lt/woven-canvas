import type { Entity } from '@lastolivegames/becsy'

export enum StrokeState {
  Idle = 'idle',
  Drawing = 'drawing',
}

export enum InkCommand {
  AddStroke = 'addStroke',
  AddStrokePoint = 'addStrokePoint',
  CompleteStroke = 'completeStroke',
  RemoveStroke = 'removeStroke',
}

export type InkCommandArgs = {
  [InkCommand.AddStroke]: [Entity, [number, number]]
  [InkCommand.AddStrokePoint]: [Entity, [number, number]]
  [InkCommand.RemoveStroke]: [Entity]
  [InkCommand.CompleteStroke]: [Entity]
}
