import {
  defineSystem,
  Camera,
  Controls,
  getPointerInput,
  type PointerInput,
} from "@infinitecanvas/editor";
import { assign, setup } from "xstate";

import { PanState } from "../components";
import { PanStateValue } from "../types";

/**
 * Pan state machine - created once at module level.
 *
 * The ECS context is available on events (ctx property) so actions
 * can access Camera and other ECS state without recreating the machine.
 */
const panMachine = setup({
  types: {
    context: {} as {
      panStartX: number;
      panStartY: number;
    },
    events: {} as PointerInput,
  },
  actions: {
    setDragStart: assign({
      panStartX: ({ event }) => event.worldPosition[0],
      panStartY: ({ event }) => event.worldPosition[1],
    }),

    moveCamera: ({ context, event }) => {
      const { ctx } = event;
      const deltaX = event.worldPosition[0] - context.panStartX;
      const deltaY = event.worldPosition[1] - context.panStartY;

      const cam = Camera.write(ctx);
      cam.left -= deltaX;
      cam.top -= deltaY;
    },

    resetContext: assign({
      panStartX: 0,
      panStartY: 0,
    }),
  },
}).createMachine({
  id: "pan",
  initial: PanStateValue.Idle,
  context: {
    panStartX: 0,
    panStartY: 0,
  },
  states: {
    [PanStateValue.Idle]: {
      entry: "resetContext",
      on: {
        pointerDown: {
          actions: "setDragStart",
          target: PanStateValue.Panning,
        },
      },
    },
    [PanStateValue.Panning]: {
      entry: "moveCamera",
      on: {
        pointerMove: {
          actions: "moveCamera",
        },
        pointerUp: {
          target: PanStateValue.Idle,
        },
        cancel: {
          target: PanStateValue.Idle,
        },
      },
    },
  },
});

/**
 * Capture pan system - handles dragging to pan the canvas.
 *
 * Uses an XState state machine to track pan state:
 * - Idle: Waiting for "hand" tool button press
 * - Panning: Dragging to pan the canvas
 *
 * Active when: A button mapped to the "hand" tool is held and dragged.
 */
export const capturePanSystem = defineSystem((ctx) => {
  // Get pointer events for buttons mapped to the "hand" tool
  const buttons = Controls.getButtons(ctx, "hand");

  const events = getPointerInput(ctx, buttons);

  if (events.length === 0) return;

  // Run machine through events - EditorStateDef.run() handles
  // reading current state, running the machine, and writing back
  PanState.run(ctx, panMachine, events);
});
