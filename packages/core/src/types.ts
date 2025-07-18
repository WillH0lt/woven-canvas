import type { Entity } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'
import { z } from 'zod/v4'
import type { History } from './History'
import type { State } from './State'

export enum EmitterEventKind {
  Command = 'command',
}

export type Command = {
  kind: string
  payload: string
}

export type EmitterEvents = {
  [EmitterEventKind.Command]: [Command]
}

export interface CoreResources extends Resources {
  emitter: Emitter<EmitterEvents>
  state: State
}

export type CommandMap = {
  [commandKind: string]: Array<unknown>
}

// export const CoreOptions = z.object({
//   persistenceKey: z.string().optional(),
// })

// export type CoreOptions = z.input<typeof CoreOptions>

// export const Options = CoreOptions.extend({
//   autoloop: z.boolean().default(true),
//   autofocus: z.boolean().default(true),
// })

export const Options = z.object({
  autoloop: z.boolean().default(true),
  autofocus: z.boolean().default(true),
})

export type Options = z.input<typeof Options>

export interface Resources {
  domElement: HTMLElement
  uid: string
  history: History
}

export interface BlockModel {
  id: string
  kind: string
  top: number
  left: number
  width: number
  height: number
  rotateZ: number
  rank: string
  stretchableWidth: boolean
  stretchableHeight: boolean
  hasStretched: boolean
}

export enum TextAlign {
  Left = 'left',
  Center = 'center',
  Right = 'right',
  Justify = 'justify',
}
export interface TextModel {
  content: string
  fontFamily: string
  align: TextAlign
  lineHeight: number
  red: number
  green: number
  blue: number
  alpha: number
}

export interface ShapeModel {
  red: number
  green: number
  blue: number
  alpha: number
}

export interface FontSizeModel {
  value: number
  lastBlockWidth: number
  lastBlockHeight: number
}

export interface CommandModel {
  kind: string
  payload: string
  uid: string
  seed: string
  frame: number
}

export type CommandArgs = Record<string, Array<unknown>>

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface ICommands {}

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface IStore {}

export type SendCommandFn<T> = <C extends keyof T>(kind: C, ...args: T[C] extends any[] ? T[C] : [T[C]]) => void

export interface ISerializable<T = Record<string, any>> {
  // id: string
  toModel(): T
  fromModel(model: T): void
}

export enum CursorIcon {
  Pointer = 'pointer',
  NESW = 'nesw',
  NWSE = 'nwse',
  NS = 'ns',
  EW = 'ew',
  RotateNW = 'rotateNW',
  RotateNE = 'rotateNE',
  RotateSE = 'rotateSE',
  RotateSW = 'rotateSW',
  Move = 'move',
  Crosshair = 'crosshair',
}

export enum CursorState {
  Select = 'select',
  Interact = 'interact',
  Dragging = 'dragging',
  Placing = 'placing',
}

export interface AabbModel {
  left: number
  right: number
  top: number
  bottom: number
}

export enum PointerType {
  Mouse = 'mouse',
  Touch = 'touch',
  Pen = 'pen',
}

export enum PointerButton {
  None = 'none',
  Left = 'left',
  Middle = 'middle',
  Right = 'right',
  Back = 'back',
  Forward = 'forward',
  PenEraser = 'penEraser',
}

export enum BlockCommand {
  SetZoom = 'setZoom',
  MoveCamera = 'moveCamera',

  AddShape = 'addShape',
  AddText = 'addText',
  UpdateBlockPosition = 'updateBlockPosition',

  SetTool = 'setTool',
  SetCursor = 'setCursor',

  Undo = 'undo',
  Redo = 'redo',
  CreateCheckpoint = 'createCheckpoint',

  BringForwardSelected = 'bringForwardSelected',
  SendBackwardSelected = 'sendBackwardSelected',
  DuplicateSelected = 'duplicateSelected',
  RemoveSelected = 'removeSelected',
}

export type BlockCommandArgs = {
  [BlockCommand.AddShape]: [Partial<BlockModel>, Partial<ShapeModel>]
  [BlockCommand.AddText]: [Partial<BlockModel>, Partial<TextModel>]
  [BlockCommand.UpdateBlockPosition]: [
    {
      id: string
      left: number
      top: number
    },
  ]

  [BlockCommand.SetTool]: [
    {
      tool: string
    },
  ]
  [BlockCommand.SetCursor]: [
    {
      icon: CursorIcon
      rotateZ: number
    },
  ]

  [BlockCommand.SetZoom]: [
    {
      zoom: number
    },
  ]
  [BlockCommand.MoveCamera]: [
    {
      x: number
      y: number
    },
  ]
  [BlockCommand.Undo]: []
  [BlockCommand.Redo]: []
  [BlockCommand.CreateCheckpoint]: []

  [BlockCommand.BringForwardSelected]: []
  [BlockCommand.SendBackwardSelected]: []
  [BlockCommand.DuplicateSelected]: []
  [BlockCommand.RemoveSelected]: []
}

export interface CommandMeta {
  seed: string
  uid: string
}

export type PointerEvent =
  | {
      type: 'pointerDown'
      worldPosition: [number, number]
      clientPosition: [number, number]
      blockEntity: Entity | null
    }
  | {
      type: 'pointerMove'
      worldPosition: [number, number]
      clientPosition: [number, number]
      blockEntity: Entity | null
    }
  | {
      type: 'pointerUp'
      worldPosition: [number, number]
      clientPosition: [number, number]
      blockEntity: Entity | null
    }
  | {
      type: 'click'
      worldPosition: [number, number]
      clientPosition: [number, number]
      blockEntity: Entity | null
    }
  | { type: 'cancel' }

export type MouseEvent =
  | {
      type: 'wheel'
      delta: number
    }
  | {
      type: 'mouseMove'
      worldPosition: [number, number]
      clientPosition: [number, number]
      blockEntity: Entity | null
    }
