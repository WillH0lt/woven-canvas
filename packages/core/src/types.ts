import type { Entity } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'
import { z } from 'zod/v4'
import type { BaseComponent } from './BaseComponent'
import { BaseExtension } from './BaseExtension'
import type { History } from './History'
import type { LocalDB } from './LocalDB'
import type { State } from './State'
import { floatingMenuStandardButtons } from './buttonCatalog'
import type {} from './components'
import { defaultKeybinds } from './constants'

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

const Keybind = z.object({
  command: z.string(),
  key: z.string(),
  mod: z.boolean().optional(),
  shift: z.boolean().optional(),
})

export const CoreOptions = z.object({
  persistenceKey: z.string().default('default'),
  keybinds: z.array(Keybind).default(defaultKeybinds),
})

export type CoreOptions = z.infer<typeof CoreOptions>
export type CoreOptionsInput = z.input<typeof CoreOptions>

export type CoreResources = BaseResources &
  CoreOptions & {
    emitter: Emitter<EmitterEvents>
    state: State
    menuContainer: HTMLDivElement
    localDB: LocalDB
  }

const BlockDefEditOptions = z.object({
  canEdit: z.boolean().default(false),
  removeWhenTextEmpty: z.boolean().default(false),
})

export const BlockDef = z.object({
  tag: z.string(),
  editOptions: BlockDefEditOptions.default(BlockDefEditOptions.parse({})),
  resizeMode: z.enum(['scale', 'text', 'free', 'groupOnly']).default('scale'),
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
  cursorIcon: z.string().optional(),
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

  highlightedBlockOutlineColor: z.string().default('var(--ic-primary)'),
  highlightedBlockOutlineWidth: z.string().default('1.5px'),
  highlightedBlockOutlineOffset: z.string().default('-1px'),
  highlightedBlockBorderRadius: z.string().default('2px'),
})

export type Theme = z.infer<typeof Theme>

const CustomTags = z.object({
  transformBox: z.string().default('ic-transform-box'),
  transformHandle: z.string().default('ic-rectangular-handle'),
  selectionBox: z.string().default('ic-selection-box'),
})

export type CustomTags = z.infer<typeof CustomTags>

export const Options = z.object({
  ...CoreOptions.shape,
  extensions: z
    .array(
      z.union([z.instanceof(BaseExtension), z.custom<(args: any) => BaseExtension>((fn) => typeof fn === 'function')]),
    )
    .default([]),
  autoloop: z.boolean().default(true),
  autofocus: z.boolean().default(true),
  customBlocks: z.array(BlockDef).default([]),
  customTools: z.array(ToolDef).default([]),
  customTags: CustomTags.default(CustomTags.parse({})),
  theme: Theme.default(Theme.parse({})),
})

export type Options = z.input<typeof Options>

export interface BaseResources {
  domElement: HTMLElement
  blockContainer: HTMLDivElement
  history: History
  blockDefs: BlockDefMap
  tags: CustomTags
  tools: ToolDefMap
  uid: string
}

export type CommandArgs = Record<string, Array<unknown>>

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface ICommands {}

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface IStore {}

export type SendCommandFn<T> = <C extends keyof T>(kind: C, ...args: T[C] extends any[] ? T[C] : [T[C]]) => void

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

export type PointerEvent = {
  type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'click' | 'cancel' | 'frame'
  worldPosition: [number, number]
  clientPosition: [number, number]
  velocity: [number, number]
  intersects: [Entity | undefined, Entity | undefined, Entity | undefined, Entity | undefined, Entity | undefined]
  obscured: boolean
  pressure: number
  pointerType: PointerType
  shiftDown: boolean
  altDown: boolean
  modDown: boolean
}

export type MouseEvent = {
  type: 'mouseMove' | 'wheel'
  wheelDeltaX: number
  wheelDeltaY: number
  worldPosition: [number, number]
  clientPosition: [number, number]
}

export type Transform = [number, number, number, number, number, number]

// Pick only serializable properties, excluding functions, Entity values, and Entity[] values
export type SerializablePropNames<T> = {
  [K in keyof T]-?: T[K] extends (...args: any) => any
    ? never
    : T[K] extends Entity[]
      ? never
      : T[K] extends Entity
        ? never
        : K
}[keyof T]

export enum SelectionState {
  Idle = 'idle',
  Pointing = 'pointing',
  Dragging = 'dragging',
  SelectionBoxPointing = 'selectionBoxPointing',
  SelectionBoxDragging = 'selectionBoxDragging',
}

export enum TransformBoxState {
  None = 'none',
  Idle = 'idle',
  Editing = 'editing',
}

export enum TransformHandleKind {
  Scale = 'scale',
  Stretch = 'stretch',
  Rotate = 'rotate',
}

export enum CursorKind {
  Drag = 'drag',
  NESW = 'nesw',
  NWSE = 'nwse',
  NS = 'ns',
  EW = 'ew',
  RotateNW = 'rotateNW',
  RotateNE = 'rotateNE',
  RotateSW = 'rotateSW',
  RotateSE = 'rotateSE',
}

export enum TextAlign {
  Left = 'left',
  Center = 'center',
  Right = 'right',
  Justify = 'justify',
}

export enum VerticalAlign {
  Top = 'top',
  Center = 'center',
  Bottom = 'bottom',
}
