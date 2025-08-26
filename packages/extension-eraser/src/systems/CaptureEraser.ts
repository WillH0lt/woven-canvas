import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import { assign, setup } from 'xstate'

import { EraserState as EraserStateComp } from '../components'
import { EraserCommand, type EraserCommandArgs, EraserState } from '../types'

type FrameEvent = {
  type: 'frame'
  worldPosition: [number, number]
}

export class CaptureEraser extends BaseSystem<EraserCommandArgs & CoreCommandArgs> {
  private readonly eraserState = this.singleton.write(EraserStateComp)

  private readonly eraserMachine = setup({
    types: {
      context: {} as {
        activeStroke: Entity | null
      },
      events: {} as PointerEvent | FrameEvent,
    },
    actions: {
      resetContext: assign({
        activeStroke: null,
      }),

      addStroke: assign({
        activeStroke: ({ event }) => {
          const entity = this.createEntity()
          this.emitCommand(EraserCommand.AddStroke, entity, event.worldPosition)
          return entity
        },
      }),

      addStrokePoint: ({ context, event }) => {
        if (!context.activeStroke) return
        this.emitCommand(EraserCommand.AddStrokePoint, context.activeStroke, event.worldPosition)
      },

      completeStroke: ({ context }) => {
        if (!context.activeStroke) return
        this.emitCommand(EraserCommand.CompleteStroke, context.activeStroke)
      },

      cancelStroke: assign({
        activeStroke: ({ context }) => {
          if (!context.activeStroke) return null
          this.emitCommand(EraserCommand.CancelStroke, context.activeStroke)
          return null
        },
      }),

      createCheckpoint: () => {
        this.emitCommand(CoreCommand.CreateCheckpoint)
      },
    },
  }).createMachine({
    id: 'eraser',
    initial: EraserState.Idle,
    context: {
      activeStroke: null,
    },
    states: {
      [EraserState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: {
            target: EraserState.Erasing,
          },
        },
      },
      [EraserState.Erasing]: {
        entry: 'addStroke',
        on: {
          frame: {
            actions: 'addStrokePoint',
          },
          pointerUp: {
            actions: 'completeStroke',
            target: EraserState.Idle,
          },
          cancel: {
            actions: 'cancelStroke',
            target: EraserState.Idle,
          },
        },
      },
    },
  })

  public execute(): void {
    const buttons = this.controls.getButtons('eraser')

    const events: (PointerEvent | FrameEvent)[] = this.getPointerEvents(buttons)

    // to get the nice trail effect we need to add a stroke point each frame,
    // we do this with a 'frame' event using the current pointer position
    if (this.eraserState.state === EraserState.Erasing && this.pointers.current.length) {
      const p = this.pointers.current[0].read(comps.Pointer).position

      const worldPosition = this.camera.toWorld(p)
      events.push({
        type: 'frame',
        worldPosition,
      })
    }

    if (!events.length) return

    const { value, context } = this.runMachine<EraserState>(
      this.eraserMachine,
      this.eraserState.state,
      this.eraserState,
      events,
    )

    Object.assign(this.eraserState, context)
    this.eraserState.state = value
  }
}
