import type { Entity } from '@lastolivegames/becsy'

import type { Snapshot } from './History'
import type { Controls, Cursor } from './components'

export enum CoreCommand {
  SetControls = 'coreSetControls',
  SetCursor = 'coreSetCursor',
  SetZoom = 'coreSetZoom',
  MoveCamera = 'coreMoveCamera',
  TranslateCamera = 'coreTranslateCamera',
  SetCameraVelocity = 'coreSetCameraVelocity',

  RemoveBlock = 'coreRemoveBlock',

  Undo = 'coreUndo',
  Redo = 'coreRedo',
  Cut = 'coreCut',
  Copy = 'coreCopy',
  Paste = 'corePaste',

  CreateCheckpoint = 'coreCreateCheckpoint',

  BringForwardSelected = 'coreBringForwardSelected',
  SendBackwardSelected = 'coreSendBackwardSelected',
  DuplicateSelected = 'coreDuplicateSelected',
  RemoveSelected = 'coreRemoveSelected',
  CloneSelected = 'coreCloneSelected',
  UncloneSelected = 'coreUncloneSelected',

  CloneEntities = 'coreCloneEntities',
  UncloneEntities = 'coreUncloneEntities',

  CreateFromSnapshot = 'coreCreateFromSnapshot',
  UpdateFromSnapshot = 'coreUpdateFromSnapshot',

  SelectBlock = 'coreSelectBlock',
  DeselectBlock = 'coreDeselectBlock',
  ToggleSelect = 'coreToggleSelect',
  DeselectAll = 'coreDeselectAll',
  SelectAll = 'coreSelectAll',

  AddSelectionBox = 'coreAddSelectionBox',
  UpdateSelectionBox = 'coreUpdateSelectionBox',
  RemoveSelectionBox = 'coreRemoveSelectionBox',

  AddOrUpdateTransformBox = 'coreAddOrUpdateTransformBox',
  UpdateTransformBox = 'coreUpdateTransformBox',
  HideTransformBox = 'coreHideTransformBox',
  ShowTransformBox = 'coreShowTransformBox',
  RemoveTransformBox = 'coreRemoveTransformBox',
  StartTransformBoxEdit = 'coreStartTransformBoxEdit',
  EndTransformBoxEdit = 'coreEndTransformBoxEdit',

  DragBlock = 'coreDragBlock',
  CreateAndDragOntoCanvas = 'coreCreateAndDragOntoCanvas',

  HideFloatingMenu = 'coreHideFloatingMenu',
  ShowFloatingMenu = 'coreShowFloatingMenu',
}

export type CoreCommandArgs = {
  [CoreCommand.SetControls]: [Partial<Controls>]
  [CoreCommand.SetCursor]: [Partial<Cursor>]
  [CoreCommand.SetZoom]: [
    {
      zoom: number
    },
  ]
  [CoreCommand.MoveCamera]: [
    {
      x: number
      y: number
    },
  ]
  [CoreCommand.TranslateCamera]: [
    {
      x: number
      y: number
    },
  ]
  [CoreCommand.SetCameraVelocity]: [
    {
      x: number
      y: number
    },
  ]

  [CoreCommand.RemoveBlock]: [string]

  [CoreCommand.Undo]: []
  [CoreCommand.Redo]: []
  [CoreCommand.Cut]: []
  [CoreCommand.Copy]: []
  [CoreCommand.Paste]: []

  [CoreCommand.CreateCheckpoint]: []

  [CoreCommand.BringForwardSelected]: []
  [CoreCommand.SendBackwardSelected]: []
  [CoreCommand.DuplicateSelected]: []
  [CoreCommand.RemoveSelected]: []
  [CoreCommand.CloneSelected]: [[number, number], string]
  [CoreCommand.UncloneSelected]: [string]

  [CoreCommand.CloneEntities]: [Entity[], [number, number], string]
  [CoreCommand.UncloneEntities]: [Entity[], string]

  [CoreCommand.CreateFromSnapshot]: [Snapshot, { selectCreated?: boolean; editCreated?: boolean }?]
  [CoreCommand.UpdateFromSnapshot]: [Snapshot]

  [CoreCommand.SelectBlock]: [
    Entity,
    (
      | {
          deselectOthers?: boolean
        }
      | undefined
    ),
  ]
  [CoreCommand.DeselectBlock]: [Entity]
  [CoreCommand.ToggleSelect]: [Entity]
  [CoreCommand.DeselectAll]: []
  [CoreCommand.SelectAll]: []

  [CoreCommand.AddSelectionBox]: []
  [CoreCommand.UpdateSelectionBox]: [
    {
      left: number
      top: number
      width: number
      height: number
    },
    (
      | {
          deselectOthers?: boolean
        }
      | undefined
    ),
  ]
  [CoreCommand.RemoveSelectionBox]: []

  [CoreCommand.AddOrUpdateTransformBox]: []
  [CoreCommand.UpdateTransformBox]: []
  [CoreCommand.HideTransformBox]: []
  [CoreCommand.ShowTransformBox]: []
  [CoreCommand.RemoveTransformBox]: []
  [CoreCommand.StartTransformBoxEdit]: []
  [CoreCommand.EndTransformBoxEdit]: []

  [CoreCommand.DragBlock]: [
    Entity,
    {
      left: number
      top: number
    },
  ]
  [CoreCommand.CreateAndDragOntoCanvas]: [Snapshot]
  [CoreCommand.HideFloatingMenu]: []
  [CoreCommand.ShowFloatingMenu]: []
}
