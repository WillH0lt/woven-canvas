import type { Entity } from '@lastolivegames/becsy'
import { assign, setup } from 'xstate'

import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import {
  BlockCommand,
  type BlockCommandArgs,
  type BlockModel,
  CursorIcon,
  CursorState,
  type MouseEvent,
  type PointerEvent,
} from '../types'

type CursorEvent = PointerEvent | MouseEvent
// | { type: 'mouseMove'; position: [number, number]; blockEntity: Entity | null }
// | { type: 'pointerDown'; position: [number, number]; blockEntity: Entity | null }
// | { type: 'pointerUp'; position: [number, number]; blockEntity: Entity | null }
// | { type: 'setTool'; tool: Tool; block: Partial<BlockModel> }
// | { type: 'cancel' }

export class CaptureCursor extends BaseSystem<BlockCommandArgs> {
  private readonly pointers = this.query((q) => q.added.removed.changed.current.with(comps.Pointer).read.trackWrites)

  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly cursorState = this.singleton.write(comps.CursorState)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly _draggables = this.query((q) => q.with(comps.Block, comps.Draggable).read)

  private readonly cursorMachine = setup({
    types: {
      context: {} as {
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
      icon: CursorIcon.Pointer,
      iconRotation: 0,
      hoveredEntity: null,
      heldBlock: '',
    },
    states: {
      [CursorState.Select]: {
        entry: 'resetContext',
        on: {
          mouseMove: {
            guard: 'isOverBlock',
            actions: 'setHoveredEntity',
            target: CursorState.Interact,
          },
        },
      },
      [CursorState.Interact]: {
        on: {
          mouseMove: [
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
                left: event.worldPosition[0],
                top: event.worldPosition[1],
              })
            },
            target: CursorState.Select,
          },
        },
      },
    },
    // on: {
    //   setTool: {
    //     actions: assign({
    //       heldBlock: ({ event }) => JSON.stringify(event.block),
    //       icon: () => CursorIcon.Crosshair,
    //     }),
    //     target: `.${CursorState.Placing}`,
    //   },
    // },
  })

  public execute(): void {
    const events = this.getCursorEvents()
    if (events.length === 0) return

    const { value, context } = this.runMachine<CursorState>(
      this.cursorMachine,
      this.cursorState.state,
      this.cursorState.toModel(),
      events,
    )

    // TODO this will maybe be handled in the store once we have a store
    if (this.cursorState.icon !== context.icon || this.cursorState.iconRotation !== context.iconRotation) {
      this.emitCommand(BlockCommand.SetCursor, context.icon, context.iconRotation)
    }

    Object.assign(this.cursorState, context)
    this.cursorState.state = value
  }

  private getCursorEvents(): CursorEvent[] {
    const events: CursorEvent[] = []

    const pointerEvents = this.getPointerEvents(this.pointers, this.camera, this.intersect)
    const mouseEvents = this.getMouseEvents(this.mouse, this.camera, this.intersect, this.keyboard)
    events.push(...pointerEvents, ...mouseEvents)

    // if (this.mouse.moveTrigger) {
    //   events.push({
    //     type: 'mouseMove',
    //     position: this.camera.toWorld(this.mouse.position),
    //     blockEntity: this.intersect.entity || null,
    //   } as CursorEvent)
    // }

    // const setToolCommand = this.getCommand(BlockCommand.SetTool)
    // if (setToolCommand) {
    //   events.push({
    //     type: 'setTool',
    //     tool: setToolCommand[0],
    //     // block: setToolCommand[1],
    //   } as CursorEvent)
    // }

    if (this.keyboard.escapeDownTrigger) {
      events.push({ type: 'cancel' } as CursorEvent)
    }

    return events
  }
}
