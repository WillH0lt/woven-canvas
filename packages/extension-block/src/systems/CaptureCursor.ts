import { BaseSystem, type BlockModel, CursorIcon, CursorState, Tool, comps as coreComps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import { assign, setup, transition } from 'xstate'
import * as blockComps from '../components'
import { BlockCommand, type BlockCommandArgs } from '../types'
import { CaptureSelection } from './CaptureSelection'
import { CaptureTransformBox } from './CaptureTransformBox'

const comps = {
  ...coreComps,
  ...blockComps,
}

type CursorEvent =
  | { type: 'pointerMove'; position: [number, number]; blockEntity: Entity | null }
  | { type: 'pointerDown'; position: [number, number]; blockEntity: Entity | null }
  | { type: 'pointerUp'; position: [number, number]; blockEntity: Entity | null }
  | { type: 'setTool'; tool: Tool; block: Partial<BlockModel> }
  | { type: 'cancel' }

export class CaptureCursor extends BaseSystem<BlockCommandArgs> {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly cursorState = this.singleton.write(comps.CursorState)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly _draggableBlocks = this.query((q) => q.with(comps.Draggable).read)

  // private ghostBlocks = this.query(
  //   (q) => q.added.with(comps.Block, comps.Ghost).read,
  // )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelection, CaptureTransformBox))
  }

  private readonly cursorMachine = setup({
    types: {
      context: {} as {
        tool: Tool
        icon: CursorIcon
        hoveredEntity: Entity | null
        heldBlock: string
      },
      events: {} as CursorEvent,
    },
    guards: {
      isOverBlock: ({ event }) => {
        if (!('blockEntity' in event)) return false
        return !!event.blockEntity
      },
      isOverDifferentBlock: ({ context, event }) => {
        if (!('blockEntity' in event)) return false
        if (!event.blockEntity) return false
        if (!context.hoveredEntity) return true
        return !event.blockEntity.isSame(context.hoveredEntity)
      },
      isOutsideBlock: ({ event }) => {
        if (!('blockEntity' in event)) return true
        return event.blockEntity === null
      },
    },
    actions: {
      resetContext: assign({
        tool: Tool.Select,
        icon: CursorIcon.Pointer,
        hoveredEntity: null,
      }),
      setHoveredEntity: assign({
        hoveredEntity: ({ event }) => {
          if (!('blockEntity' in event) || !event.blockEntity) return null
          return event.blockEntity
        },
      }),
      setCursorIcon: assign({
        icon: ({ event }) => {
          let icon = CursorIcon.Pointer
          if ('blockEntity' in event && event.blockEntity) {
            const draggable = event.blockEntity.read(comps.Draggable)
            icon = draggable.hoverCursor
          }
          return icon
        },
      }),
    },
  }).createMachine({
    id: 'cursor',
    initial: CursorState.Select,
    context: {
      tool: Tool.Select,
      icon: CursorIcon.Pointer,
      hoveredEntity: null,
      heldBlock: '',
    },
    states: {
      [CursorState.Select]: {
        entry: 'resetContext',
        on: {
          pointerMove: {
            guard: 'isOverBlock',
            actions: ['setHoveredEntity', 'setCursorIcon'],
            target: CursorState.Interact,
          },
        },
      },
      [CursorState.Interact]: {
        on: {
          pointerMove: [
            {
              guard: 'isOverDifferentBlock',
              actions: ['setHoveredEntity', 'setCursorIcon'],
              target: CursorState.Interact,
            },
            {
              guard: 'isOutsideBlock',
              actions: ['setHoveredEntity', 'setCursorIcon'],
              target: CursorState.Select,
            },
          ],
          pointerDown: {
            target: CursorState.Dragging,
          },
        },
      },
      [CursorState.Dragging]: {
        entry: assign({
          // set move icon
          icon: ({ context }) => {
            let icon = context.icon
            if (icon === CursorIcon.Pointer) {
              icon = CursorIcon.Move
            }
            return icon
          },
        }),
        on: {
          pointerUp: {
            actions: 'setCursorIcon',
            target: CursorState.Select,
          },
          cancel: {
            target: CursorState.Select,
          },
        },
      },
      [CursorState.Placing]: {
        on: {
          cancel: {
            target: CursorState.Select,
          },
          pointerUp: {
            actions: ({ context, event }) => {
              let block: Partial<BlockModel> = {}
              try {
                block = JSON.parse(context.heldBlock)
              } catch (e) {
                console.error('Failed to parse held block:', e)
              }
              this.emitCommand(BlockCommand.AddBlock, {
                ...block,
                left: event.position[0],
                top: event.position[1],
              })
            },
            target: CursorState.Select,
          },
        },
      },
    },
    on: {
      setTool: {
        actions: assign({
          tool: ({ event }) => {
            return event.tool
          },
          heldBlock: ({ event }) => {
            return JSON.stringify(event.block)
          },
          icon: () => {
            return CursorIcon.Crosshair
          },
        }),
        target: `.${CursorState.Placing}`,
      },
    },
  })

  // public initialize(): void {
  //   this.addCommandListener(BlockCommand.SetTool, this.setTool.bind(this))
  // }

  public execute(): void {
    this.runMachine()
  }

  private runMachine(): void {
    const events = this.getCursorEvents()
    if (events.length === 0) return

    let state = this.cursorMachine.resolveState({
      value: this.cursorState.state,
      context: this.cursorState,
    })

    for (const event of events) {
      const result = transition(this.cursorMachine, state, event)
      state = result[0]

      for (const action of result[1]) {
        if (typeof action.exec === 'function') {
          action.exec(action.info, action.params)
        }
      }
    }

    // TODO this will be handled in the store once we have a store
    if (this.cursorState.icon !== state.context.icon) {
      this.emitCommand(BlockCommand.SetCursor, state.context.icon)
    }

    Object.assign(this.cursorState, state.context)
    this.cursorState.state = state.value
  }

  private getCursorEvents(): CursorEvent[] {
    const events = []

    if (this.pointer.downTrigger) {
      events.push({
        type: 'pointerDown',
        position: this.pointer.downPosition,
        blockEntity: this.intersect.entity || null,
      } as CursorEvent)
    }

    if (this.pointer.upTrigger) {
      events.push({
        type: 'pointerUp',
        position: this.pointer.upPosition,
        blockEntity: this.intersect.entity || null,
      } as CursorEvent)
    }

    if (this.pointer.moveTrigger) {
      events.push({
        type: 'pointerMove',
        position: this.pointer.position,
        blockEntity: this.intersect.entity || null,
      } as CursorEvent)
    }

    const setToolCommand = this.getCommand(BlockCommand.SetTool)
    if (setToolCommand) {
      events.push({
        type: 'setTool',
        tool: setToolCommand[0],
        block: setToolCommand[1],
      } as CursorEvent)
    }

    if (this.keyboard.escapeDownTrigger) {
      events.push({ type: 'cancel' } as CursorEvent)
    }

    return events
  }
}
