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
  fonts: z.array(z.string()).default([]),
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
  fontSize: number
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

export enum CoreCommand {
  SetZoom = 'setZoom',
  MoveCamera = 'moveCamera',

  AddShape = 'addShape',
  AddText = 'addText',
  UpdateBlock = 'updateBlock',

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

export type CoreCommandArgs = {
  [CoreCommand.AddShape]: [Partial<BlockModel>, Partial<ShapeModel>]
  [CoreCommand.AddText]: [Partial<BlockModel>, Partial<TextModel>]
  [CoreCommand.UpdateBlock]: [Entity, Partial<BlockModel>]

  [CoreCommand.SetTool]: [
    {
      tool: string
    },
  ]
  [CoreCommand.SetCursor]: [
    {
      icon: CursorIcon
      rotateZ: number
    },
  ]

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
  [CoreCommand.Undo]: []
  [CoreCommand.Redo]: []
  [CoreCommand.CreateCheckpoint]: []

  [CoreCommand.BringForwardSelected]: []
  [CoreCommand.SendBackwardSelected]: []
  [CoreCommand.DuplicateSelected]: []
  [CoreCommand.RemoveSelected]: []
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

export interface CharData {
  /** The page of the font texture that the character is on. */
  page: number
  /** The x position of the character in the page. */
  x: number
  /** The y position of the character in the page. */
  y: number
  /** The width of the character in the page. */
  width: number
  /** The height of the character in the page. */
  height: number
  /** The letter of the character. */
  letter: string
  /** Unique id of character */
  id: number
  /** x-offset to apply when rendering character */
  xOffset: number
  /** y-offset to apply when rendering character. */
  yOffset: number
  /** Advancement to apply to next character. */
  xAdvance: number
  /** The kerning values for this character. */
  kerning: Record<string, number>
}

export interface FontData {
  /** The name of the font face */
  face: string
  /** The offset of the font face from the baseline. */
  baseLineOffset: number
  /** The map of characters by character code. */
  chars: Record<string, CharData>
  /** The map of base page textures (i.e., sheets of glyphs). */
  pages: {
    /** Unique id for bitmap texture */
    id: number
    /** File name */
    file: string
  }[]
  /** The line-height of the font face in pixels. */
  lineHeight: number
  /** The size of the font face in pixels. */
  fontSize: number
  /** The name of the font face. */
  fontFamily: string
  /** The range and type of the distance field for this font. */
  distanceField?: {
    /** Type of distance field */
    type: 'sdf' | 'msdf' | 'none'
    /** Range of the distance field in pixels */
    range: number
  }
}
