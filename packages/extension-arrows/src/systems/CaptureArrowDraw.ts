import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import { Block, Persistent } from '@infinitecanvas/core/components'
import { distance } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'
import { assign, setup } from 'xstate'
import { ArrowDrawState as ArrowDrawStateComp } from '../components'
import { ArrowCommand, type ArrowCommandArgs, ArrowDrawState, ArrowKind } from '../types'

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4

export class CaptureArrowDraw extends BaseSystem<ArrowCommandArgs & CoreCommandArgs> {
  private readonly _blocks = this.query((q) => q.with(Block, Persistent))

  private readonly arrowDrawState = this.singleton.write(ArrowDrawStateComp)

  private readonly arrowDrawMachine = setup({
    types: {
      context: {} as {
        pointingStartClient: [number, number]
        pointingStartWorld: [number, number]
        activeArrow: Entity | null
      },
      events: {} as PointerEvent,
    },
    guards: {
      isThresholdReached: ({ context, event }) => {
        const dist = distance(context.pointingStartClient, event.clientPosition)
        return dist >= POINTING_THRESHOLD
      },
    },
    actions: {
      setPointingStart: assign({
        pointingStartClient: ({ event }) => event.clientPosition,
        pointingStartWorld: ({ event }) => event.worldPosition,
      }),
      resetContext: assign({
        pointingStartClient: [0, 0],
        pointingStartWorld: [0, 0],
      }),
      addArrow: assign({
        activeArrow: ({ context }) => {
          const entity = this.createEntity()
          this.emitCommand(ArrowCommand.AddArrow, entity, context.pointingStartWorld, this.arrowDrawState.kind)
          return entity
        },
      }),

      removeArrow: assign({
        activeArrow: ({ context }) => {
          if (!context.activeArrow) return null
          this.emitCommand(ArrowCommand.RemoveArrow, context.activeArrow)
          return null
        },
      }),
      drawArrow: ({ context, event }) => {
        if (!context.activeArrow) return
        this.emitCommand(ArrowCommand.DrawArrow, context.activeArrow, context.pointingStartWorld, event.worldPosition)
      },
      selectActiveArrow: ({ context }) => {
        if (!context.activeArrow) return
        this.emitCommand(CoreCommand.SelectBlock, context.activeArrow, { deselectOthers: true })
      },
      exitArrowControl: () => {
        this.emitCommand(CoreCommand.SetControls, { leftMouseTool: 'select' })
      },
      deselectAll: () => {
        this.emitCommand(CoreCommand.DeselectAll)
      },
    },
  }).createMachine({
    id: 'arrowDraw',
    initial: ArrowDrawState.Idle,
    context: {
      pointingStartClient: [0, 0],
      pointingStartWorld: [0, 0],
      activeArrow: null,
    },
    states: {
      [ArrowDrawState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: [
            {
              actions: 'deselectAll',
              target: ArrowDrawState.Pointing,
            },
          ],
        },
      },
      [ArrowDrawState.Pointing]: {
        entry: 'setPointingStart',
        on: {
          pointerMove: {
            guard: 'isThresholdReached',
            target: ArrowDrawState.Dragging,
          },
          pointerUp: {
            target: ArrowDrawState.Idle,
          },
          cancel: {
            target: ArrowDrawState.Idle,
          },
        },
      },
      [ArrowDrawState.Dragging]: {
        entry: 'addArrow',
        exit: ['exitArrowControl', 'selectActiveArrow'],
        on: {
          pointerMove: {
            actions: 'drawArrow',
          },
          pointerUp: {
            target: ArrowDrawState.Idle,
          },
          cancel: {
            target: ArrowDrawState.Idle,
          },
        },
      },
    },
  })

  public execute(): void {
    const buttons = this.controls.getButtons('arc-arrow', 'elbow-arrow')
    const events = this.getPointerEvents(buttons)

    if (events.length === 0) return

    this.arrowDrawState.kind = this.controls.leftMouseTool === 'elbow-arrow' ? ArrowKind.Elbow : ArrowKind.Arc

    const { value, context } = this.runMachine<ArrowDrawState>(
      this.arrowDrawMachine,
      this.arrowDrawState.state,
      this.arrowDrawState.toContext(),
      events,
    )

    Object.assign(this.arrowDrawState, context)
    this.arrowDrawState.state = value
  }
}
