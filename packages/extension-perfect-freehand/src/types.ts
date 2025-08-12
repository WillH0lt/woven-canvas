import type { Entity } from '@lastolivegames/becsy'

export enum StrokeState {
  Idle = 'idle',
  Drawing = 'drawing',
}

export enum PerfectFreehandCommand {
  AddStroke = 'addStroke',
  AddStrokePoint = 'addStrokePoint',
  CompleteStroke = 'completeStroke',
  RemoveStroke = 'removeStroke',
}

export type PerfectFreehandCommandArgs = {
  [PerfectFreehandCommand.AddStroke]: [Entity, [number, number]]
  [PerfectFreehandCommand.AddStrokePoint]: [Entity, [number, number]]
  [PerfectFreehandCommand.RemoveStroke]: [Entity]
  [PerfectFreehandCommand.CompleteStroke]: [Entity]
}
