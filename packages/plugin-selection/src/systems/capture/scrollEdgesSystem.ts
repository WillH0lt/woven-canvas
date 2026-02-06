import { assign, not, setup } from "xstate";
import {
  type InferStateContext,
  defineEditorSystem,
  Controls,
  Camera,
  Screen,
  getPointerInput,
  getPluginResources,
  type PointerInput,
  type Context,
} from "@infinitecanvas/editor";

import {
  SelectionStateSingleton,
  ScrollEdgesStateSingleton,
} from "../../singletons";
import {
  SelectionState,
  ScrollEdgesState,
  type SelectionPluginOptions,
} from "../../types";
import { PLUGIN_NAME } from "../../constants";

/**
 * Scroll edges state machine context - derived from ScrollEdgesStateSingleton schema.
 */
type ScrollEdgesContext = InferStateContext<typeof ScrollEdgesStateSingleton>;

/**
 * Helper to get edge scrolling options from event context.
 */
function getEdgeScrollingOptions(ctx: Context) {
  return getPluginResources<SelectionPluginOptions>(ctx, PLUGIN_NAME)
    .edgeScrolling;
}

/**
 * Scroll edges state machine - auto-scrolls camera when pointer is near viewport edges.
 */
const scrollEdgesMachine = setup({
  types: {
    context: {} as ScrollEdgesContext,
    events: {} as PointerInput,
  },
  guards: {
    isPointerNearEdge: ({ event }) => {
      const { edgeSizePx } = getEdgeScrollingOptions(event.ctx);
      const screen = Screen.read(event.ctx);
      const viewportWidth = screen.width;
      const viewportHeight = screen.height;

      const cursorX = event.screenPosition[0];
      const cursorY = event.screenPosition[1];

      return (
        cursorX < edgeSizePx ||
        cursorX > viewportWidth - edgeSizePx ||
        cursorY < edgeSizePx ||
        cursorY > viewportHeight - edgeSizePx
      );
    },

    isEdgeScrollDelayPassed: ({ context, event }) => {
      const { edgeScrollDelayMs } = getEdgeScrollingOptions(event.ctx);
      return (
        performance.now() - context.edgeEnterStartTime >= edgeScrollDelayMs
      );
    },
  },

  actions: {
    setEdgeEnterStartTime: assign({
      edgeEnterStartTime: () => performance.now(),
    }),

    moveCamera: ({ event }) => {
      const { edgeSizePx, edgeScrollSpeedPxPerFrame } = getEdgeScrollingOptions(
        event.ctx,
      );
      const screen = Screen.read(event.ctx);
      const camera = Camera.read(event.ctx);

      const viewportWidth = screen.width;
      const viewportHeight = screen.height;

      const cursorX = event.screenPosition[0];
      const cursorY = event.screenPosition[1];

      let shiftX = 0;
      let shiftY = 0;

      const shift = edgeScrollSpeedPxPerFrame / camera.zoom;

      if (cursorX < edgeSizePx) {
        shiftX = -shift;
      } else if (cursorX > viewportWidth - edgeSizePx) {
        shiftX = shift;
      }

      if (cursorY < edgeSizePx) {
        shiftY = -shift;
      } else if (cursorY > viewportHeight - edgeSizePx) {
        shiftY = shift;
      }

      if (shiftX === 0 && shiftY === 0) return;

      const cam = Camera.write(event.ctx);
      cam.left += shiftX;
      cam.top += shiftY;
    },

    resetContext: assign({
      edgeEnterStartTime: 0,
    }),
  },
}).createMachine({
  id: "scrollEdges",
  initial: ScrollEdgesState.Idle,
  context: {
    edgeEnterStartTime: 0,
  },
  states: {
    [ScrollEdgesState.Idle]: {
      entry: "resetContext",
      on: {
        pointerMove: {
          guard: "isPointerNearEdge",
          target: ScrollEdgesState.Waiting,
        },
      },
    },
    [ScrollEdgesState.Waiting]: {
      entry: "setEdgeEnterStartTime",
      on: {
        pointerMove: {
          guard: not("isPointerNearEdge"),
          target: ScrollEdgesState.Idle,
        },
        frame: {
          guard: "isEdgeScrollDelayPassed",
          target: ScrollEdgesState.Scrolling,
        },
      },
    },
    [ScrollEdgesState.Scrolling]: {
      on: {
        frame: [
          {
            guard: not("isPointerNearEdge"),
            target: ScrollEdgesState.Idle,
          },
          {
            actions: "moveCamera",
          },
        ],
      },
    },
  },
});

/**
 * Scroll edges capture system - auto-scrolls when dragging near viewport edges.
 *
 * When the user is dragging blocks or a selection box and moves the pointer
 * near the edge of the viewport, this system automatically scrolls the camera
 * in that direction after a brief delay.
 *
 * Only active when the selection state is "dragging" or "selectionBoxDragging".
 */
export const scrollEdgesSystem = defineEditorSystem(
  { phase: "capture" },
  (ctx) => {
    // Skip if edge scrolling is disabled
    if (!getEdgeScrollingOptions(ctx).enabled) return;

    // Only run when actively dragging
    const selectionState = SelectionStateSingleton.read(ctx).state;
    if (
      selectionState !== SelectionState.Dragging &&
      selectionState !== SelectionState.SelectionBoxDragging
    ) {
      return;
    }

    const currentState = ScrollEdgesStateSingleton.read(ctx).state;

    // Include frame events when waiting or scrolling (to check delay / drive scrolling)
    // Frame events from getPointerInput include pointer position data
    const includeFrameEvent =
      currentState === ScrollEdgesState.Waiting ||
      currentState === ScrollEdgesState.Scrolling;

    // Get pointer events for buttons mapped to the "select" tool
    const buttons = Controls.getButtons(ctx, "select");
    const events = getPointerInput(ctx, buttons, { includeFrameEvent });

    if (events.length === 0) return;

    // Run machine through events
    ScrollEdgesStateSingleton.run(ctx, scrollEdgesMachine, events);
  },
);
