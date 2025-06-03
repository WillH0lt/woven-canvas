import type { Block } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export enum BlockCommand {
  AddBlock = 'addBlock',
  UpdateBlock = 'updateBlock',
  AddSelectionBox = 'addSelectionBox',
  RemoveSelectionBoxes = 'removeSelectionBoxes',
}

export type BlockCommandArgs = {
  [BlockCommand.AddBlock]: [Partial<Block>]
  [BlockCommand.UpdateBlock]: [Entity, Partial<Block>]
  [BlockCommand.AddSelectionBox]: [
    {
      start: [number, number]
    },
  ]
  [BlockCommand.RemoveSelectionBoxes]: []
}
