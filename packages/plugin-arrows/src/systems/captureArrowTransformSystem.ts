import { assign, not, setup } from "xstate";
import {
  type InferStateContext,
  defineEditorSystem,
  Controls,
  getPointerInput,
  type PointerInput,
  type EntityId,
  type Context,
  hasComponent,
} from "@infinitecanvas/editor";
import {
  getLocalSelectedBlocks,
  getAddedLocalSelectedBlocks,
  getRemovedLocalSelectedBlocks,
} from "@infinitecanvas/plugin-selection";

import { ArrowTransformState } from "../singletons";
import { ArrowTransformStateEnum } from "../types";
import { ArcArrow, ElbowArrow } from "../components";
import {
  AddOrUpdateTransformHandles,
  RemoveTransformHandles,
  HideTransformHandles,
  ShowTransformHandles,
} from "../commands";

/**
 * Arrow transform state machine context - derived from ArrowTransformState schema.
 */
type ArrowTransformContext = InferStateContext<typeof ArrowTransformState>;

type SelectionEvent =
  | PointerInput
  | {
      type: "selectionChanged";
      ctx: Context;
      selectedEntities: EntityId[];
    };

/**
 * Arrow transform state machine - handles selection and transform of arrows.
 *
 * This machine handles:
 * - Detecting when a single arrow is selected
 * - Adding/removing transform handles
 * - Hiding/showing handles during operations
 */
const arrowTransformMachine = setup({
  types: {
    context: {} as ArrowTransformContext,
    events: {} as SelectionEvent,
  },
  guards: {
    selectingSingleArrow: ({ event }) => {
      if (!("selectedEntities" in event)) return false;
      if (event.selectedEntities.length !== 1) return false;

      const entityId = event.selectedEntities[0];
      return (
        hasComponent(event.ctx, entityId, ArcArrow) ||
        hasComponent(event.ctx, entityId, ElbowArrow)
      );
    },
  },
  actions: {
    setActiveArrow: assign({
      activeArrow: ({ event }): EntityId | null => {
        if (!("selectedEntities" in event)) return null;
        if (event.selectedEntities.length === 0) return null;
        return event.selectedEntities[0];
      },
    }),

    addOrUpdateTransformHandles: ({ context, event }) => {
      if (!context.activeArrow) return;
      AddOrUpdateTransformHandles.spawn(event.ctx, {
        arrowEntityId: context.activeArrow,
      });
    },

    removeTransformHandles: ({ event }) => {
      RemoveTransformHandles.spawn(event.ctx, {});
    },

    hideTransformHandles: ({ event }) => {
      HideTransformHandles.spawn(event.ctx, {});
    },

    showTransformHandles: ({ event }) => {
      ShowTransformHandles.spawn(event.ctx, {});
    },
  },
}).createMachine({
  id: "arrowTransform",
  initial: ArrowTransformStateEnum.None,
  context: {
    activeArrow: null,
  },
  states: {
    [ArrowTransformStateEnum.None]: {
      entry: "removeTransformHandles",
      on: {
        selectionChanged: [
          {
            guard: "selectingSingleArrow",
            actions: "setActiveArrow",
            target: ArrowTransformStateEnum.Idle,
          },
        ],
      },
    },
    [ArrowTransformStateEnum.Idle]: {
      entry: "addOrUpdateTransformHandles",
      on: {
        selectionChanged: [
          {
            guard: not("selectingSingleArrow"),
            target: ArrowTransformStateEnum.None,
          },
          {
            actions: ["setActiveArrow", "addOrUpdateTransformHandles"],
          },
        ],
        pointerDown: {
          actions: "hideTransformHandles",
        },
        pointerUp: {
          actions: "showTransformHandles",
        },
      },
    },
  },
});

/**
 * Capture arrow transform system - runs the arrow transform state machine.
 *
 * Runs in the capture phase to handle selection changes and transform operations.
 */
export const captureArrowTransformSystem = defineEditorSystem(
  { phase: "capture", priority: 99 },
  (ctx) => {
    const events = getSelectionEvents(ctx);
    if (events.length === 0) return;

    ArrowTransformState.run(ctx, arrowTransformMachine, events);
  }
);

/**
 * Get selection-related events for the transform state machine.
 */
function getSelectionEvents(ctx: Context): SelectionEvent[] {
  const events: SelectionEvent[] = [];

  // Check for selection changes using tracking query
  // Filter by current session to only detect changes for this user
  const added = getAddedLocalSelectedBlocks(ctx);
  const removed = getRemovedLocalSelectedBlocks(ctx);

  if (added.length > 0 || removed.length > 0) {
    // Get blocks selected by the current session only
    const selectedEntities = getLocalSelectedBlocks(ctx);

    events.push({
      type: "selectionChanged",
      ctx,
      selectedEntities,
    });
  }

  // Get pointer events for select tool
  const buttons = Controls.getButtons(ctx, "select");
  const pointerEvents = getPointerInput(ctx, buttons);
  events.push(...pointerEvents);

  return events;
}
