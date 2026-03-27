import { Vec2 } from '@woven-canvas/math'
import { createEntity, type EntityId } from '@woven-ecs/core'
import { assign, setup } from 'xstate'

import { defineCommand } from '../../command'
import { AddShapeBlock, CompleteShapeBlock, DrawShapeBlock, PlaceShapeBlock, RemoveShapeBlock } from '../../commands'
import type { InferStateContext } from '../../EditorStateDef'
import { defineEditorSystem } from '../../EditorSystem'
import type { PointerInput } from '../../events'
import { getPointerInput } from '../../events'
import { Controls } from '../../singletons/Controls'
import { Cursor } from '../../singletons/Cursor'
import { ShapeDrawState, ShapeDrawStateEnum } from '../../singletons/ShapeDrawState'

/** Minimum distance (in screen pixels) before transitioning from Pointing to Drawing */
const POINTING_THRESHOLD = 4

/**
 * Command to deselect all blocks.
 * Defined here with the same name as in plugin-selection so the command system routes it there.
 */
const DeselectAll = defineCommand<void>('deselect-all')

type ShapeDrawContext = InferStateContext<typeof ShapeDrawState>

/**
 * Shape draw state machine - handles pointer events for drawing new shapes.
 *
 * Flow:
 * - Idle → pointerDown → Pointing (record start position)
 * - Pointing → pointerMove (past threshold) → Drawing (create shape entity)
 * - Drawing → pointerMove → update shape geometry
 * - Drawing → pointerUp → Idle (complete shape)
 * - Pointing → pointerUp → Idle (place default shape)
 * - Any → cancel → Idle (remove shape if exists)
 */
const shapeDrawMachine = setup({
  types: {
    context: {} as ShapeDrawContext,
    events: {} as PointerInput,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      const worldDist = Vec2.distance(context.pointingStartWorld as [number, number], event.worldPosition)
      return worldDist * event.cameraZoom >= POINTING_THRESHOLD
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
      activeShape: () => null,
    }),

    addShape: assign({
      activeShape: ({ context, event }): EntityId => {
        const startWorld = context.pointingStartWorld as [number, number]
        const entityId = createEntity(event.ctx)
        AddShapeBlock.spawn(event.ctx, {
          entityId,
          position: startWorld,
        })
        return entityId
      },
    }),

    drawShape: ({ context, event }) => {
      if (!context.activeShape) return
      const startWorld = context.pointingStartWorld as [number, number]
      DrawShapeBlock.spawn(event.ctx, {
        entityId: context.activeShape,
        start: startWorld,
        end: event.worldPosition,
      })
    },

    completeShape: ({ context, event }) => {
      if (!context.activeShape) return
      CompleteShapeBlock.spawn(event.ctx, { entityId: context.activeShape })
    },

    removeShape: assign({
      activeShape: ({ context, event }): EntityId | null => {
        if (!context.activeShape) return null
        RemoveShapeBlock.spawn(event.ctx, { entityId: context.activeShape })
        return null
      },
    }),

    placeShape: ({ context, event }) => {
      const startWorld = context.pointingStartWorld as [number, number]
      const entityId = createEntity(event.ctx)
      PlaceShapeBlock.spawn(event.ctx, {
        entityId,
        position: startWorld,
      })
    },

    exitShapeControl: ({ event }) => {
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
  id: 'shapeDraw',
  initial: ShapeDrawStateEnum.Idle,
  context: {
    activeShape: null,
    pointingStartClient: [0, 0] as [number, number],
    pointingStartWorld: [0, 0] as [number, number],
  },
  states: {
    [ShapeDrawStateEnum.Idle]: {
      entry: 'resetContext',
      on: {
        pointerDown: [
          {
            actions: 'deselectAll',
            target: ShapeDrawStateEnum.Pointing,
          },
        ],
      },
    },
    [ShapeDrawStateEnum.Pointing]: {
      entry: 'setPointingStart',
      on: {
        pointerMove: {
          guard: 'isThresholdReached',
          target: ShapeDrawStateEnum.Drawing,
        },
        pointerUp: {
          actions: ['placeShape', 'exitShapeControl'],
          target: ShapeDrawStateEnum.Idle,
        },
        cancel: {
          target: ShapeDrawStateEnum.Idle,
        },
      },
    },
    [ShapeDrawStateEnum.Drawing]: {
      entry: 'addShape',
      on: {
        pointerMove: {
          actions: 'drawShape',
        },
        pointerUp: {
          actions: ['completeShape', 'exitShapeControl'],
          target: ShapeDrawStateEnum.Idle,
        },
        cancel: {
          actions: 'removeShape',
          target: ShapeDrawStateEnum.Idle,
        },
      },
    },
  },
})

/**
 * Capture shape draw system - runs the shape draw state machine.
 *
 * Runs in the capture phase to handle pointer events for the shape draw tool.
 * Generates commands that are processed by the update system.
 */
export const captureShapeDrawSystem = defineEditorSystem({ phase: 'capture', priority: 100 }, (ctx) => {
  const buttons = Controls.getButtons(ctx, 'shape')

  if (buttons.length === 0) return

  const events = getPointerInput(ctx, buttons)

  if (events.length === 0) return

  ShapeDrawState.run(ctx, shapeDrawMachine, events)
})
