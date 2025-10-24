import type { Entity } from '@lastolivegames/becsy'
import { z } from 'zod/v4'
import type { BaseResources } from '@infinitecanvas/core'

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


export const Options = z.object({
  preEraseOpacity: z.number().min(0).max(255).default(50),
})

export type Options = z.infer<typeof Options>

export type OptionsInput = z.input<typeof Options>

export type EraserResources = Options & BaseResources
