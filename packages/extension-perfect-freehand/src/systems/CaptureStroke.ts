import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import { assign, setup } from 'xstate'

import { StrokeState as StrokeStateComp } from '../components'
import { PerfectFreehandCommand, type PerfectFreehandCommandArgs, StrokeState } from '../types'

export class CaptureStroke extends BaseSystem<PerfectFreehandCommandArgs & CoreCommandArgs> {
  private readonly pointers = this.query((q) => q.added.removed.current.changed.with(comps.Pointer).trackWrites)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

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
          this.emitCommand(PerfectFreehandCommand.AddStroke, entity, event.worldPosition)
          return entity
        },
      }),

      addStrokePoint: ({ context, event }) => {
        if (!context.activeStroke) return
        this.emitCommand(PerfectFreehandCommand.AddStrokePoint, context.activeStroke, event.worldPosition)
      },

      completeStroke: ({ context }) => {
        if (!context.activeStroke) return
        this.emitCommand(PerfectFreehandCommand.CompleteStroke, context.activeStroke)
      },

      removeStroke: assign({
        activeStroke: ({ context }) => {
          if (!context.activeStroke) return null
          this.emitCommand(PerfectFreehandCommand.RemoveStroke, context.activeStroke)
          return null
        },
      }),

      createCheckpoint: () => {
        this.emitCommand(CoreCommand.CreateCheckpoint)
      },
    },
  }).createMachine({
    id: 'perfect-freehand',
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
    const button = this.tool.getButton('perfect-freehand')
    if (!button) return

    const events = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
      button,
    })

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
