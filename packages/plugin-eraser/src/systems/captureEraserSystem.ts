import { assign, setup } from "xstate";
import {
  type InferStateContext,
  defineEditorSystem,
  Controls,
  getPointerInput,
  type PointerInput,
} from "@infinitecanvas/editor";

import { EraserStateSingleton } from "../singletons";
import { EraserState } from "../types";
import {
  StartEraserStroke,
  AddEraserStrokePoint,
  CompleteEraserStroke,
  CancelEraserStroke,
} from "../commands";

/**
 * Eraser state machine context - derived from EraserStateSingleton schema.
 */
type EraserContext = InferStateContext<typeof EraserStateSingleton>;

/**
 * Eraser state machine - handles pointer events for the eraser tool.
 *
 * This machine handles:
 * - Clicking to start erasing
 * - Dragging to draw an eraser stroke
 * - Releasing to complete the stroke (delete intersected blocks)
 * - Cancel to abort the stroke (restore blocks)
 */
const eraserMachine = setup({
  types: {
    context: {} as EraserContext,
    events: {} as PointerInput,
  },
  guards: {},
  actions: {
    startStroke: ({ event }) => {
      StartEraserStroke.spawn(event.ctx, {
        worldPosition: event.worldPosition,
      });
    },

    addPoint: assign({
      lastWorldPosition: ({ event, context }): [number, number] => {
        if (!context.activeStroke) return context.lastWorldPosition;
        AddEraserStrokePoint.spawn(event.ctx, {
          strokeId: context.activeStroke,
          worldPosition: event.worldPosition,
        });
        return [event.worldPosition[0], event.worldPosition[1]];
      },
    }),

    completeStroke: ({ event, context }) => {
      if (!context.activeStroke) return;
      CompleteEraserStroke.spawn(event.ctx, {
        strokeId: context.activeStroke,
      });
    },

    cancelStroke: ({ event, context }) => {
      if (!context.activeStroke) return;
      CancelEraserStroke.spawn(event.ctx, {
        strokeId: context.activeStroke,
      });
    },

    resetContext: assign({
      activeStroke: () => null,
      lastWorldPosition: (): [number, number] => [0, 0],
    }),
  },
}).createMachine({
  id: "eraser",
  initial: EraserState.Idle,
  context: {
    activeStroke: null,
    lastWorldPosition: [0, 0],
  },
  states: {
    [EraserState.Idle]: {
      entry: ["resetContext"],
      on: {
        pointerDown: {
          target: EraserState.Erasing,
          actions: ["startStroke"],
        },
      },
    },
    [EraserState.Erasing]: {
      on: {
        pointerMove: {
          actions: ["addPoint"],
        },
        frame: {
          actions: ["addPoint"],
        },
        pointerUp: {
          target: EraserState.Idle,
          actions: ["completeStroke"],
        },
        cancel: {
          target: EraserState.Idle,
          actions: ["cancelStroke"],
        },
      },
    },
  },
});

/**
 * Capture eraser system - runs the eraser state machine.
 *
 * Runs in the capture phase to handle pointer events for the eraser tool.
 * Generates commands that are processed by the update system.
 */
export const captureEraserSystem = defineEditorSystem(
  { phase: "capture", priority: 100 },
  (ctx) => {
    // Get pointer buttons mapped to 'eraser' tool
    const buttons = Controls.getButtons(ctx, "eraser");

    // Get pointer events with frame events for continuous erasing
    const events = getPointerInput(ctx, buttons, { includeFrameEvent: true });

    if (events.length === 0) return;

    EraserStateSingleton.run(ctx, eraserMachine, events);
  }
);
