import type { Entity } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'
import { z } from 'zod/v4'
import type { BaseComponent } from './BaseComponent'
import { BaseExtension } from './BaseExtension'
import type { History, Snapshot } from './History'
import type { LocalDB } from './LocalDB'
import type { State } from './State'
import { floatingMenuStandardButtons } from './buttonCatalog'
// import { standardButtonSet } from './buttonCatalog'

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

export const Button = z.object({
  tag: z.string(),
  tooltip: z.string().default(''),
  menu: z.string().default(''),
  width: z.number().default(40),
})

export type ButtonInput = z.input<typeof Button>
export type Button = z.infer<typeof Button>

export interface CoreResources extends BaseResources {
  emitter: Emitter<EmitterEvents>
  state: State
  menuContainer: HTMLDivElement
  localDB: LocalDB
}

export const CoreOptions = z.object({
  persistenceKey: z.string().default('default'),
})

export type CoreOptions = z.infer<typeof CoreOptions>
export type CoreOptionsInput = z.input<typeof CoreOptions>

export const BlockDef = z.object({
  tag: z.string(),
  canEdit: z.boolean().default(false),
  resizeMode: z.enum(['scale', 'text', 'free']).default('scale'),
  components: z.array(z.custom<new () => BaseComponent>(() => true)).default([]),
  floatingMenu: z.array(Button).default(floatingMenuStandardButtons.map((btn) => Button.parse(btn))),
  editedFloatingMenu: z.array(Button).default([]),
  // intersectPoint: z
  //   .custom<(component: Entity, point: [number, number]) => boolean>(
  //     (val) => {
  //       if (typeof val !== 'function') return false
  //       if (val.length !== 2) return false
  //       return true
  //     },
  //     {
  //       message: 'Must be a valid intersection function',
  //     },
  //   )
  //   .default(() => (_entity: Entity, _point: [number, number]) => true),
})

export type BlockDef = z.infer<typeof BlockDef>

export type BlockDefInput = z.input<typeof BlockDef>

const Theme = z.object({
  gray100: z.string().default('#f8f9f9'),
  gray200: z.string().default('#e3e5e8'),
  gray300: z.string().default('#c7ccd1'),
  gray400: z.string().default('#9099a4'),
  gray500: z.string().default('#4f5660'),
  gray600: z.string().default('#2e3338'),
  gray700: z.string().default('#060607'),

  primaryLight: z.string().default('#8a76f4'),
  primary: z.string().default('#6a58f2'),

  menuBorderRadius: z.string().default('12px'),
  menuTooltipBorderRadius: z.string().default('6px'),
  transitionDuration: z.string().default('150ms'),
  transitionTimingFunction: z.string().default('cubic-bezier(0.4, 0, 0.2, 1)'),
})

export type Theme = z.infer<typeof Theme>

export const Options = z.object({
  extensions: z
    .array(
      z.union([z.instanceof(BaseExtension), z.custom<(args: any) => BaseExtension>((fn) => typeof fn === 'function')]),
    )
    .default([]),
  autoloop: z.boolean().default(true),
  autofocus: z.boolean().default(true),
  customBlocks: z.array(BlockDef).default([]),
  persistenceKey: z.string().default('default'),
  theme: Theme.default(Theme.parse({})),
})

export type Options = z.input<typeof Options>

export type BlockDefMap = Record<string, z.infer<typeof BlockDef>>

export interface BaseResources {
  domElement: HTMLElement
  blockContainer: HTMLDivElement
  history: History
  blockDefs: BlockDefMap
  uid: string
}

export type CommandArgs = Record<string, Array<unknown>>

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface ICommands {}

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface IStore {}

export type SendCommandFn<T> = <C extends keyof T>(kind: C, ...args: T[C] extends any[] ? T[C] : [T[C]]) => void

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

  SetTool = 'setTool',
  SetCursor = 'setCursor',

  Undo = 'undo',
  Redo = 'redo',
  CreateCheckpoint = 'createCheckpoint',

  BringForwardSelected = 'bringForwardSelected',
  SendBackwardSelected = 'sendBackwardSelected',
  DuplicateSelected = 'duplicateSelected',
  RemoveSelected = 'removeSelected',

  CreateFromSnapshot = 'createFromSnapshot',
  UpdateFromSnapshot = 'updateFromSnapshot',
}

export type CoreCommandArgs = {
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

  [CoreCommand.CreateFromSnapshot]: [Snapshot]
  [CoreCommand.UpdateFromSnapshot]: [Snapshot]
}

export type PointerEvent = {
  type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'click' | 'cancel'
  worldPosition: [number, number]
  clientPosition: [number, number]
  blockEntity: Entity | null
}

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

export type Transform = [number, number, number, number, number, number]
