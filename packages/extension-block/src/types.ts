import type { Block } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export enum DragState {
  Pointing = 'pointing',
  Dragging = 'dragging',
  End = 'End',
}

export interface Dragged {
  state: DragState
  blockStart: [number, number]
  grabOffset: [number, number]
  pointerStart: [number, number]
  delta: [number, number]
}

export enum BlockCommand {
  AddBlock = 'addBlock',
  UpdateBlock = 'updateBlock',
  TranslateBlock = 'translateBlock',
  AddSelectionBox = 'addSelectionBox',
  RemoveSelectionBoxes = 'removeSelectionBoxes',

  StartDrag = 'startDrag',
  UpdateDrag = 'UpdateDrag',
}

export type BlockCommandArgs = {
  [BlockCommand.AddBlock]: [Partial<Block>]
  [BlockCommand.UpdateBlock]: [Entity, Partial<Block>]
  [BlockCommand.TranslateBlock]: [
    Entity,
    {
      dx: number
      dy: number
    },
  ]
  [BlockCommand.AddSelectionBox]: [
    {
      start: [number, number]
    },
  ]
  [BlockCommand.RemoveSelectionBoxes]: []

  [BlockCommand.StartDrag]: [Entity, Partial<Dragged>]
  [BlockCommand.UpdateDrag]: [Entity, Partial<Dragged>]
}
