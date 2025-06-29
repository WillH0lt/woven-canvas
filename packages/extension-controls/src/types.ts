import type { BlockModel, Resources } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { z } from 'zod/v4'

export enum PointerAction {
  None = 'none',
  Select = 'select',
  Pan = 'pan',
  Menu = 'menu',
}

export enum WheelAction {
  None = 'none',
  Zoom = 'zoom',
  Scroll = 'scroll',
}

export enum PanState {
  Idle = 'idle',
  Panning = 'panning',
}

export enum SelectionState {
  Idle = 'idle',
  Pointing = 'pointing',
  Dragging = 'dragging',
  SelectionBoxPointing = 'selectionBoxPointing',
  SelectionBoxDragging = 'selectionBoxDragging',
}

export const ControlOptions = z.object({
  actionLeftMouse: z.string().default(PointerAction.None),
  actionMiddleMouse: z.string().default(PointerAction.Pan),
  actionRightMouse: z.string().default(PointerAction.None),
  actionWheel: z.string().default(WheelAction.Scroll),
  actionModWheel: z.string().default(WheelAction.Zoom),
})

export interface SelectBlockOptions {
  deselectOthers?: boolean
}

export type ControlOptions = z.input<typeof ControlOptions>

export enum ControlCommand {
  AddSelectionBox = 'addSelectionBox',
  UpdateSelectionBox = 'updateSelectionBox',
  RemoveSelectionBoxes = 'removeSelectionBoxes',

  SelectBlock = 'selectBlock',
  DeselectBlock = 'deselectBlock',
  DeselectAll = 'deselectAll',
  RemoveSelected = 'removeSelected',

  AddOrUpdateTransformBox = 'addOrUpdateTransformBox',
  HideTransformBox = 'hideTransformBox',
  ShowTransformBox = 'showTransformBox',
  RemoveTransformBox = 'removeTransformBox',
}

export type ControlCommandArgs = {
  [ControlCommand.AddSelectionBox]: []
  [ControlCommand.UpdateSelectionBox]: [Partial<BlockModel>]
  [ControlCommand.RemoveSelectionBoxes]: []

  [ControlCommand.SelectBlock]: [Entity, SelectBlockOptions]
  [ControlCommand.DeselectBlock]: [Entity]
  [ControlCommand.DeselectAll]: []
  [ControlCommand.RemoveSelected]: []

  [ControlCommand.AddOrUpdateTransformBox]: []
  [ControlCommand.HideTransformBox]: []
  [ControlCommand.ShowTransformBox]: []
  [ControlCommand.RemoveTransformBox]: []
}

export interface ControlResources extends Resources {
  controlOptions: ControlOptions
}

export enum TransformHandleKind {
  Scale = 'scale',
  Rotate = 'rotate',
}
