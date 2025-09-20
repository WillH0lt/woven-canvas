import { BaseSystem, type CoreCommandArgs, type PointerEvent, PointerType } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { assign, setup } from 'xstate'

import { StrokeState as StrokeStateComp } from '../components'
import { InkCommand, type InkCommandArgs, StrokeState } from '../types'

export class CaptureStroke extends BaseSystem<InkCommandArgs & CoreCommandArgs> {
  private readonly strokeState = this.singleton.write(StrokeStateComp)

  private readonly strokeMachine = setup({
    types: {
      context: {} as {
        activeStroke: Entity | null
      },
      events: {} as PointerEvent,
    },
    actions: {
      resetContext: assign({
        activeStroke: null,
      }),

      addStroke: assign({
        activeStroke: ({ event }) => {
          const entity = this.createEntity()
          const pressure = event.pointerType === PointerType.Pen ? event.pressure : null
          console.log('pressure', pressure)
          this.emitCommand(InkCommand.AddStroke, entity, event.worldPosition, pressure)
          return entity
        },
      }),

      addStrokePoint: ({ context, event }) => {
        if (!context.activeStroke) return
        const pressure = event.pointerType === PointerType.Pen ? event.pressure : null
        this.emitCommand(InkCommand.AddStrokePoint, context.activeStroke, event.worldPosition, pressure)
      },

      completeStroke: ({ context }) => {
        if (!context.activeStroke) return
        this.emitCommand(InkCommand.CompleteStroke, context.activeStroke)
      },

      removeStroke: assign({
        activeStroke: ({ context }) => {
          if (!context.activeStroke) return null
          this.emitCommand(InkCommand.RemoveStroke, context.activeStroke)
          return null
        },
      }),
    },
  }).createMachine({
    id: 'ink',
    initial: StrokeState.Idle,
    context: {
      activeStroke: null,
    },
    states: {
      [StrokeState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: {
            target: StrokeState.Drawing,
          },
        },
      },
      [StrokeState.Drawing]: {
        entry: 'addStroke',
        on: {
          pointerMove: {
            actions: 'addStrokePoint',
          },
          pointerUp: {
            actions: 'completeStroke',
            target: StrokeState.Idle,
          },
          cancel: {
            actions: 'removeStroke',
            target: StrokeState.Idle,
          },
        },
      },
    },
  })

  public execute(): void {
    const buttons = this.controls.getButtons('ink')

    const events = this.getPointerEvents(buttons)

    if (!events.length) return

    const { value, context } = this.runMachine<StrokeState>(
      this.strokeMachine,
      this.strokeState.state,
      this.strokeState,
      events,
    )

    Object.assign(this.strokeState, context)
    this.strokeState.state = value
  }
}
