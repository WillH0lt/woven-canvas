import type { Entity } from '@lastolivegames/becsy'
import { assign, setup, transition } from 'xstate'

import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { BlockCommand, type BlockCommandArgs, type BlockModel, CursorIcon, CursorState, Tool } from '../types'
import { CaptureSelection } from './CaptureSelection'
import { CaptureTransformBox } from './CaptureTransformBox'

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

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly _draggables = this.query((q) => q.with(comps.Block, comps.Draggable).read)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelection, CaptureTransformBox))
  }

  private readonly cursorMachine = setup({
    types: {
      context: {} as {
        tool: Tool
        icon: CursorIcon
        iconRotation: number
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
        iconRotation: 0,
        hoveredEntity: null,
        heldBlock: '',
      }),
      setHoveredEntity: assign({
        hoveredEntity: ({ event }) => {
          if (!('blockEntity' in event) || !event.blockEntity) return null
          return event.blockEntity
        },
        icon: ({ event }) => {
          let icon = CursorIcon.Pointer
          if ('blockEntity' in event && event.blockEntity) {
            const draggable = event.blockEntity.read(comps.Draggable)
            icon = draggable.hoverCursor
          }
          return icon
        },
        iconRotation: ({ event }) => {
          if (!('blockEntity' in event) || !event.blockEntity) return 0
          // if (!context.hoveredEntity) return 0
          const block = event.blockEntity.read(comps.Block)
          return block.rotateZ
        },
      }),
    },
  }).createMachine({
    id: 'cursor',
    initial: CursorState.Select,
    context: {
      tool: Tool.Select,
      icon: CursorIcon.Pointer,
      iconRotation: 0,
      hoveredEntity: null,
      heldBlock: '',
    },
    states: {
      [CursorState.Select]: {
        entry: 'resetContext',
        on: {
          pointerMove: {
            guard: 'isOverBlock',
            actions: 'setHoveredEntity',
            target: CursorState.Interact,
          },
        },
      },
      [CursorState.Interact]: {
        on: {
          pointerMove: [
            {
              guard: 'isOverDifferentBlock',
              actions: 'setHoveredEntity',
              target: CursorState.Interact,
            },
            {
              guard: 'isOutsideBlock',
              actions: 'setHoveredEntity',
              target: CursorState.Select,
            },
          ],
          pointerDown: {
            actions: 'setHoveredEntity',
            target: CursorState.Dragging,
          },
        },
      },
      [CursorState.Dragging]: {
        entry: assign({
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
            target: CursorState.Select,
          },
          pointerMove: {
            actions: assign({
              iconRotation: ({ context }) => {
                if (!context.hoveredEntity) return 0
                const block = context.hoveredEntity.read(comps.Block)
                return block.rotateZ
              },
            }),
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
          tool: ({ event }) => event.tool,
          heldBlock: ({ event }) => JSON.stringify(event.block),
          icon: () => CursorIcon.Crosshair,
        }),
        target: `.${CursorState.Placing}`,
      },
    },
  })

  public execute(): void {
    this.runMachine()
  }

  private runMachine(): void {
    const events = this.getCursorEvents()
    if (events.length === 0) return

    let state = this.cursorMachine.resolveState({
      value: this.cursorState.state,
      context: {
        tool: this.cursorState.tool,
        icon: this.cursorState.icon,
        iconRotation: this.cursorState.iconRotation,
        hoveredEntity: this.cursorState.hoveredEntity,
        heldBlock: this.cursorState.heldBlock,
      },
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

    // TODO this will maybe be handled in the store once we have a store
    if (this.cursorState.icon !== state.context.icon || this.cursorState.iconRotation !== state.context.iconRotation) {
      this.emitCommand(BlockCommand.SetCursor, state.context.icon, state.context.iconRotation)
    }

    Object.assign(this.cursorState, state.context)
    this.cursorState.state = state.value
  }

  private getCursorEvents(): CursorEvent[] {
    const events = []

    if (this.pointer.downTrigger) {
      events.push({
        type: 'pointerDown',
        position: this.camera.toWorld(this.pointer.downPosition),
        blockEntity: this.intersect.entity || null,
      } as CursorEvent)
    }

    if (this.pointer.upTrigger) {
      events.push({
        type: 'pointerUp',
        position: this.camera.toWorld(this.pointer.upPosition),
        blockEntity: this.intersect.entity || null,
      } as CursorEvent)
    }

    if (this.pointer.moveTrigger) {
      events.push({
        type: 'pointerMove',
        position: this.camera.toWorld(this.pointer.position),
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
