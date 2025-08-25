import type { Entity } from '@lastolivegames/becsy'

export enum EraserState {
  Idle = 'idle',
  Erasing = 'erasing',
}

export enum EraserCommand {
  AddStroke = 'eraserAddStroke',
  AddStrokePoint = 'eraserAddStrokePoint',
  CompleteStroke = 'eraserCompleteStroke',
  CancelStroke = 'eraserCancelStroke',
}

export type EraserCommandArgs = {
  [EraserCommand.AddStroke]: [Entity, [number, number]]
  [EraserCommand.AddStrokePoint]: [Entity, [number, number]]
  [EraserCommand.CancelStroke]: [Entity]
  [EraserCommand.CompleteStroke]: [Entity]
}
