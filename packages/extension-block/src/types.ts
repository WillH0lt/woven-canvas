import type { Block } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export enum Selection {
  Idle = 'idle',
  Pointing = 'pointing',
  Dragging = 'dragging',
  SelectionBoxPointing = 'selectionBoxPointing',
  SelectionBoxDragging = 'selectionBoxDragging',
}

export enum BlockCommand {
  AddBlock = 'addBlock',
  UpdateBlock = 'updateBlock',
  RemoveBlock = 'removeBlock',

  AddSelectionBox = 'addSelectionBox',
  UpdateSelectionBox = 'updateSelectionBox',
  RemoveSelectionBoxes = 'removeSelectionBoxes',
}

export type BlockCommandArgs = {
  [BlockCommand.AddBlock]: [Partial<Block>]
  [BlockCommand.UpdateBlock]: [Entity, Partial<Block>]
  [BlockCommand.RemoveBlock]: [Entity]

  [BlockCommand.AddSelectionBox]: [Partial<Block>]
  [BlockCommand.UpdateSelectionBox]: [Partial<Block>]
  [BlockCommand.RemoveSelectionBoxes]: []
}
