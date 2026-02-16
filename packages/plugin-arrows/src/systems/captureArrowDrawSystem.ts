import { assign, setup } from "xstate";
import {
  type InferStateContext,
  defineEditorSystem,
  Controls,
  Cursor,
  getPointerInput,
  createEntity,
  type PointerInput,
  type EntityId,
} from "@infinitecanvas/core";
import { Vec2 } from "@infinitecanvas/math";
import { DeselectAll } from "@infinitecanvas/plugin-selection";

import { ArrowDrawState } from "../singletons";
import { ArrowDrawStateEnum, ArrowKind } from "../types";
import { AddArrow, RemoveArrow } from "../commands";
import { POINTING_THRESHOLD } from "../constants";

/**
 * Arrow draw state machine context - derived from ArrowDrawState schema.
 */
type ArrowDrawContext = InferStateContext<typeof ArrowDrawState>;

/**
 * Arrow draw state machine - handles pointer events for drawing new arrows.
 *
 * This machine handles:
 * - Clicking to start pointing (waiting for drag threshold)
 * - Dragging to draw an arrow
 * - Releasing to complete the arrow
 * - Cancel to abort the arrow
 */
const arrowDrawMachine = setup({
  types: {
    context: {} as ArrowDrawContext,
    events: {} as PointerInput,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      const dist = Vec2.distance(
        context.pointingStartClient as [number, number],
        event.screenPosition
      );
      return dist >= POINTING_THRESHOLD;
    },
  },
  actions: {
    setPointingStart: assign({
      pointingStartClient: ({ event }): [number, number] => [
        event.screenPosition[0],
        event.screenPosition[1],
      ],
      pointingStartWorld: ({ event }): [number, number] => [
        event.worldPosition[0],
        event.worldPosition[1],
      ],
    }),

    resetContext: assign({
      pointingStartClient: (): [number, number] => [0, 0],
      pointingStartWorld: (): [number, number] => [0, 0],
      activeArrow: () => null,
    }),

    addArrow: assign({
      activeArrow: ({ context, event }): EntityId => {
        const kind = context.kind as ArrowKind;
        const startWorld = context.pointingStartWorld as [number, number];
        const entityId = createEntity(event.ctx);
        AddArrow.spawn(event.ctx, {
          entityId,
          position: startWorld,
          kind,
        });
        return entityId;
      },
    }),

    removeArrow: assign({
      activeArrow: ({ context, event }): EntityId | null => {
        if (!context.activeArrow) return null;
        RemoveArrow.spawn(event.ctx, { entityId: context.activeArrow });
        return null;
      },
    }),

    exitArrowControl: ({ event }) => {
      const controls = Controls.write(event.ctx);
      controls.leftMouseTool = "select";

      const cursor = Cursor.write(event.ctx);
      cursor.cursorKind = "select";
    },

    deselectAll: ({ event }) => {
      DeselectAll.spawn(event.ctx)
    },
  },
}).createMachine({
  id: "arrowDraw",
  initial: ArrowDrawStateEnum.Idle,
  context: {
    activeArrow: null,
    kind: ArrowKind.Elbow,
    pointingStartClient: [0, 0] as [number, number],
    pointingStartWorld: [0, 0] as [number, number],
  },
  states: {
    [ArrowDrawStateEnum.Idle]: {
      entry: "resetContext",
      on: {
        pointerDown: [
          {
            actions: "deselectAll",
            target: ArrowDrawStateEnum.Pointing,
          },
        ],
      },
    },
    [ArrowDrawStateEnum.Pointing]: {
      entry: "setPointingStart",
      on: {
        pointerMove: {
          guard: "isThresholdReached",
          target: ArrowDrawStateEnum.Dragging,
        },
        pointerUp: {
          target: ArrowDrawStateEnum.Idle,
        },
        cancel: {
          target: ArrowDrawStateEnum.Idle,
        },
      },
    },
    [ArrowDrawStateEnum.Dragging]: {
      // Create arrow and hand off drag to selection system
      entry: "addArrow",
      // Exit arrow control when done
      exit: "exitArrowControl",
      on: {
        pointerUp: {
          target: ArrowDrawStateEnum.Idle,
        },
        cancel: {
          actions: "removeArrow",
          target: ArrowDrawStateEnum.Idle,
        },
      },
    },
  },
});

/**
 * Capture arrow draw system - runs the arrow draw state machine.
 *
 * Runs in the capture phase to handle pointer events for the arrow draw tools.
 * Generates commands that are processed by the update system.
 */
export const captureArrowDrawSystem = defineEditorSystem(
  { phase: "capture", priority: 100 },
  (ctx) => {
    // Get pointer buttons mapped to arrow tools
    const buttons = Controls.getButtons(ctx, "arc-arrow", "elbow-arrow");

    // Skip if no arrow tool is active
    if (buttons.length === 0) return;

    // Get pointer events
    const events = getPointerInput(ctx, buttons);

    if (events.length === 0) return;

    // Update arrow kind based on active tool
    const leftMouseTool = Controls.read(ctx).leftMouseTool;
    const state = ArrowDrawState.write(ctx);
    state.kind =
      leftMouseTool === "elbow-arrow" ? ArrowKind.Elbow : ArrowKind.Arc;

    ArrowDrawState.run(ctx, arrowDrawMachine, events);
  }
);
