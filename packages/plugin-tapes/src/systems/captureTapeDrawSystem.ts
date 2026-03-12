import {
  Controls,
  Cursor,
  createEntity,
  defineEditorSystem,
  type EntityId,
  getPointerInput,
  type InferStateContext,
  type PointerInput,
} from '@woven-canvas/core'
import { Vec2 } from '@woven-canvas/math'
import { DeselectAll } from '@woven-canvas/plugin-selection'
import { assign, setup } from 'xstate'
import { AddTape, CompleteTape, DrawTape, PlaceTape, RemoveTape } from '../commands'
import { POINTING_THRESHOLD } from '../constants'
import { TapeDrawState } from '../singletons'
import { TapeDrawStateEnum } from '../types'

/**
 * Tape draw state machine context - derived from TapeDrawState schema.
 */
type TapeDrawContext = InferStateContext<typeof TapeDrawState>

/**
 * Tape draw state machine - handles pointer events for drawing new tape.
 *
 * Flow:
 * - Idle → pointerDown → Pointing (record start position)
 * - Pointing → pointerMove (past threshold) → Drawing (create tape entity)
 * - Drawing → pointerMove → update tape geometry
 * - Drawing → pointerUp → Idle (complete tape)
 * - Any → cancel → Idle (remove tape if exists)
 */
const tapeDrawMachine = setup({
  types: {
    context: {} as TapeDrawContext,
    events: {} as PointerInput,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      const dist = Vec2.distance(context.pointingStartClient as [number, number], event.screenPosition)
      return dist >= POINTING_THRESHOLD
    },
  },
  actions: {
    setPointingStart: assign({
      pointingStartClient: ({ event }): [number, number] => [event.screenPosition[0], event.screenPosition[1]],
      pointingStartWorld: ({ event }): [number, number] => [event.worldPosition[0], event.worldPosition[1]],
    }),

    resetContext: assign({
      pointingStartClient: (): [number, number] => [0, 0],
      pointingStartWorld: (): [number, number] => [0, 0],
      activeTape: () => null,
    }),

    addTape: assign({
      activeTape: ({ context, event }): EntityId => {
        const startWorld = context.pointingStartWorld as [number, number]
        const entityId = createEntity(event.ctx)
        AddTape.spawn(event.ctx, {
          entityId,
          position: startWorld,
        })
        return entityId
      },
    }),

    drawTape: ({ context, event }) => {
      if (!context.activeTape) return
      const startWorld = context.pointingStartWorld as [number, number]
      DrawTape.spawn(event.ctx, {
        entityId: context.activeTape,
        start: startWorld,
        end: event.worldPosition,
      })
    },

    completeTape: ({ context, event }) => {
      if (!context.activeTape) return
      CompleteTape.spawn(event.ctx, { entityId: context.activeTape })
    },

    removeTape: assign({
      activeTape: ({ context, event }): EntityId | null => {
        if (!context.activeTape) return null
        RemoveTape.spawn(event.ctx, { entityId: context.activeTape })
        return null
      },
    }),

    placeTape: ({ context, event }) => {
      const startWorld = context.pointingStartWorld as [number, number]
      const entityId = createEntity(event.ctx)
      PlaceTape.spawn(event.ctx, {
        entityId,
        position: startWorld,
      })
    },

    exitTapeControl: ({ event }) => {
      const controls = Controls.write(event.ctx)
      controls.leftMouseTool = 'select'

      const cursor = Cursor.write(event.ctx)
      cursor.cursorKind = 'select'
    },

    deselectAll: ({ event }) => {
      DeselectAll.spawn(event.ctx)
    },
  },
}).createMachine({
  id: 'tapeDraw',
  initial: TapeDrawStateEnum.Idle,
  context: {
    activeTape: null,
    pointingStartClient: [0, 0] as [number, number],
    pointingStartWorld: [0, 0] as [number, number],
  },
  states: {
    [TapeDrawStateEnum.Idle]: {
      entry: 'resetContext',
      on: {
        pointerDown: [
          {
            actions: 'deselectAll',
            target: TapeDrawStateEnum.Pointing,
          },
        ],
      },
    },
    [TapeDrawStateEnum.Pointing]: {
      entry: 'setPointingStart',
      on: {
        pointerMove: {
          guard: 'isThresholdReached',
          target: TapeDrawStateEnum.Drawing,
        },
        pointerUp: {
          actions: ['placeTape', 'exitTapeControl'],
          target: TapeDrawStateEnum.Idle,
        },
        cancel: {
          target: TapeDrawStateEnum.Idle,
        },
      },
    },
    [TapeDrawStateEnum.Drawing]: {
      entry: 'addTape',
      exit: 'exitTapeControl',
      on: {
        pointerMove: {
          actions: 'drawTape',
        },
        pointerUp: {
          actions: 'completeTape',
          target: TapeDrawStateEnum.Idle,
        },
        cancel: {
          actions: 'removeTape',
          target: TapeDrawStateEnum.Idle,
        },
      },
    },
  },
})

/**
 * Capture tape draw system - runs the tape draw state machine.
 *
 * Runs in the capture phase to handle pointer events for the tape draw tool.
 * Generates commands that are processed by the update system.
 */
export const captureTapeDrawSystem = defineEditorSystem({ phase: 'capture', priority: 100 }, (ctx) => {
  // Get pointer buttons mapped to tape tool
  const buttons = Controls.getButtons(ctx, 'tape')

  // Skip if tape tool is not active
  if (buttons.length === 0) return

  // Get pointer events
  const events = getPointerInput(ctx, buttons)

  if (events.length === 0) return

  TapeDrawState.run(ctx, tapeDrawMachine, events)
})
