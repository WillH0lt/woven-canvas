import { assign, setup } from "xstate";
import {
  type InferStateContext,
  defineEditorSystem,
  Controls,
  getPointerInput,
  type PointerInput,
  PointerType,
} from "@infinitecanvas/editor";

import { PenStateSingleton } from "../singletons";
import { PenState } from "../types";
import {
  StartPenStroke,
  AddPenStrokePoint,
  CompletePenStroke,
  RemovePenStroke,
} from "../commands";

/**
 * Pen state machine context - derived from PenStateSingleton schema.
 */
type PenContext = InferStateContext<typeof PenStateSingleton>;

/**
 * Pen state machine - handles pointer events for the pen tool.
 *
 * This machine handles:
 * - Pressing to start drawing
 * - Dragging to draw a pen stroke with pressure sensitivity
 * - Releasing to complete the stroke
 * - Cancel to abort and remove the stroke
 */
const penMachine = setup({
  types: {
    context: {} as PenContext,
    events: {} as PointerInput,
  },
  guards: {},
  actions: {
    startStroke: ({ event }) => {
      // Extract pressure from pen input, null for mouse/touch
      const pressure =
        event.pointerType === PointerType.Pen ? event.pressure : null;

      StartPenStroke.spawn(event.ctx, {
        worldPosition: event.worldPosition,
        pressure,
      });
    },

    addPoint: assign({
      lastWorldPosition: ({ event, context }): [number, number] => {
        if (!context.activeStroke) return context.lastWorldPosition;

        // Extract pressure from pen input
        const pressure =
          event.pointerType === PointerType.Pen ? event.pressure : null;

        AddPenStrokePoint.spawn(event.ctx, {
          strokeId: context.activeStroke,
          worldPosition: event.worldPosition,
          pressure,
        });
        return [event.worldPosition[0], event.worldPosition[1]];
      },
    }),

    completeStroke: ({ event, context }) => {
      if (!context.activeStroke) return;
      CompletePenStroke.spawn(event.ctx, {
        strokeId: context.activeStroke,
      });
    },

    removeStroke: ({ event, context }) => {
      if (!context.activeStroke) return;
      RemovePenStroke.spawn(event.ctx, {
        strokeId: context.activeStroke,
      });
    },

    resetContext: assign({
      activeStroke: () => null,
      lastWorldPosition: (): [number, number] => [0, 0],
    }),
  },
}).createMachine({
  id: "pen",
  initial: PenState.Idle,
  context: {
    activeStroke: null,
    lastWorldPosition: [0, 0],
  },
  states: {
    [PenState.Idle]: {
      entry: ["resetContext"],
      on: {
        pointerDown: {
          target: PenState.Drawing,
          actions: ["startStroke"],
        },
      },
    },
    [PenState.Drawing]: {
      on: {
        pointerMove: {
          actions: ["addPoint"],
        },
        pointerUp: {
          target: PenState.Idle,
          actions: ["completeStroke"],
        },
        cancel: {
          target: PenState.Idle,
          actions: ["removeStroke"],
        },
      },
    },
  },
});

/**
 * Capture pen system - runs the pen state machine.
 *
 * Runs in the capture phase to handle pointer events for the pen tool.
 * Generates commands that are processed by the update system.
 */
export const capturePenSystem = defineEditorSystem(
  { phase: "capture", priority: 100 },
  (ctx) => {
    // Get pointer buttons mapped to 'pen' tool
    const buttons = Controls.getButtons(ctx, "pen");

    // Get pointer events (no frame events needed for pen unlike eraser)
    const events = getPointerInput(ctx, buttons);

    if (events.length === 0) return;

    PenStateSingleton.run(ctx, penMachine, events);
  }
);
