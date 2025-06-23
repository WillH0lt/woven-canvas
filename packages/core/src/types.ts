import type { Entity } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'
import { z } from 'zod/v4'
import type { Store } from './Store'

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
  store: Store
}

export type CommandMap = {
  [commandKind: string]: Array<unknown>
}

export const Options = z.object({
  autoloop: z.boolean().default(true),
  autofocus: z.boolean().default(true),
})

export type Options = z.input<typeof Options>

export interface Resources {
  domElement: HTMLElement
}

export interface BlockModel {
  id: string
  top: number
  left: number
  width: number
  height: number
  red: number
  green: number
  blue: number
  alpha: number
  rotateZ: number
  rank: string
}

export type CommandArgs = Record<string, Array<unknown>>

// biome-ignore lint/suspicious/noEmptyInterface: this type gets built upon with extensions
export interface ICommands {}

export type SendCommandFn<T> = <C extends keyof T>(kind: C, ...args: T[C] extends any[] ? T[C] : [T[C]]) => void

export interface IStorable<T = Record<string, any>> {
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

  AddBlock = 'addBlock',
  UpdateBlockPosition = 'updateBlockPosition',
  RemoveBlock = 'removeBlock',

  SetTool = 'setTool',
  SetCursor = 'setCursor',
}

export type BlockCommandArgs = {
  [BlockCommand.AddBlock]: [Partial<BlockModel>]
  [BlockCommand.UpdateBlockPosition]: [
    Entity,
    {
      left: number
      top: number
    },
  ]
  [BlockCommand.RemoveBlock]: [Entity]

  [BlockCommand.SetTool]: [string]
  [BlockCommand.SetCursor]: [CursorIcon, number]

  [BlockCommand.SetZoom]: [number]
  [BlockCommand.MoveCamera]: [number, number]
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
