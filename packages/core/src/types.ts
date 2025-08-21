import type { Entity } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'
import { z } from 'zod/v4'
import type { BaseComponent } from './BaseComponent'
import { BaseExtension } from './BaseExtension'
import type { History, Snapshot } from './History'
import type { LocalDB } from './LocalDB'
import type { State } from './State'
import { floatingMenuStandardButtons } from './buttonCatalog'
import type { Controls } from './components'

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

// export const ToolbarButton = z.object({
//   tag: z.string(),
//   tooltip: z.string().optional(),
//   menu: z.string().optional(),
//   tool: z.string().optional(),
// })

// export type ToolbarButtonInput = z.input<typeof ToolbarButton>
// export type ToolbarButton = z.infer<typeof ToolbarButton>

export const FloatingMenuButton = z.object({
  tag: z.string(),
  tooltip: z.string().optional(),
  menu: z.string().optional(),
  width: z.number().default(40),
})

export type FloatingMenuButtonInput = z.input<typeof FloatingMenuButton>
export type FloatingMenuButton = z.infer<typeof FloatingMenuButton>

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
  floatingMenu: z
    .array(FloatingMenuButton)
    .default(floatingMenuStandardButtons.map((btn) => FloatingMenuButton.parse(btn))),
  editedFloatingMenu: z.array(FloatingMenuButton).default([]),
})

export type BlockDef = z.infer<typeof BlockDef>

export type BlockDefInput = z.input<typeof BlockDef>

export type BlockDefMap = Record<string, z.infer<typeof BlockDef>>

export const ToolDef = z.object({
  name: z.string(),
  buttonTag: z.string().optional(),
  buttonTooltip: z.string().optional(),
  buttonMenuTag: z.string().optional(),
})

export type ToolDefInput = z.input<typeof ToolDef>

export type ToolDef = z.infer<typeof ToolDef>

export type ToolDefMap = Record<string, z.infer<typeof ToolDef>>

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

  highlightedBlockOutlineColor: z.string().default('var(--ic-primary-light)'),
  highlightedBlockOutlineWidth: z.string().default('2px'),
  highlightedBlockOutlineOffset: z.string().default('-1px'),
  highlightedBlockBorderRadius: z.string().default('2px'),
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
  customTools: z.array(ToolDef).default([]),
  persistenceKey: z.string().default('default'),
  theme: Theme.default(Theme.parse({})),
})

export type Options = z.input<typeof Options>

export interface BaseResources {
  domElement: HTMLElement
  blockContainer: HTMLDivElement
  history: History
  blockDefs: BlockDefMap
  tools: ToolDefMap
  uid: string
}

export type CommandArgs = Record<string, Array<unknown>>

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface ICommands {}

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface IStore {}

export type SendCommandFn<T> = <C extends keyof T>(kind: C, ...args: T[C] extends any[] ? T[C] : [T[C]]) => void

export enum CursorIcon {
  Select = 'select',
  Hand = 'hand',
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
  SetControls = 'setControls',

  Undo = 'undo',
  Redo = 'redo',
  Cut = 'cut',
  Copy = 'copy',
  Paste = 'paste',

  CreateCheckpoint = 'createCheckpoint',

  BringForwardSelected = 'bringForwardSelected',
  SendBackwardSelected = 'sendBackwardSelected',
  DuplicateSelected = 'duplicateSelected',
  RemoveSelected = 'removeSelected',

  CreateFromSnapshot = 'createFromSnapshot',
  UpdateFromSnapshot = 'updateFromSnapshot',

  SelectBlock = 'selectBlock',
  DeselectBlock = 'deselectBlock',
  DeselectAll = 'deselectAll',
}

export type CoreCommandArgs = {
  [CoreCommand.SetControls]: [Partial<Controls>]
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
  [CoreCommand.Cut]: []
  [CoreCommand.Copy]: []
  [CoreCommand.Paste]: []

  [CoreCommand.CreateCheckpoint]: []

  [CoreCommand.BringForwardSelected]: []
  [CoreCommand.SendBackwardSelected]: []
  [CoreCommand.DuplicateSelected]: []
  [CoreCommand.RemoveSelected]: []

  [CoreCommand.CreateFromSnapshot]: [Snapshot]
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
  [CoreCommand.DeselectAll]: []
}

export type PointerEvent = {
  type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'click' | 'cancel'
  worldPosition: [number, number]
  clientPosition: [number, number]
  blockEntity: Entity | null
}

export type MouseEvent = {
  type: 'mouseMove' | 'wheel'
  wheelDelta: number
  worldPosition: [number, number]
  clientPosition: [number, number]
  blockEntity: Entity | null
}

export type Transform = [number, number, number, number, number, number]

// Pick only non-function properties, excluding anything from BaseComponent
export type NonFunctionPropNames<T> = {
  [K in keyof T]-?: T[K] extends (...args: any) => any ? never : K
}[keyof T]
