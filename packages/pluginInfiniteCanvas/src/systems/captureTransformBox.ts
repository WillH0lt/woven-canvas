import { and, not, setup } from "xstate";
import {
  type Context,
  type EntityId,
  type PointerInput,
  defineSystem,
  defineQuery,
  Controls,
  getPointerInput,
  hasComponent,
} from "@infinitecanvas/editor";

import { Block, Selected, TransformBox, TransformHandle } from "../components";
import {
  AddOrUpdateTransformBox,
  UpdateTransformBox,
  HideTransformBox,
  ShowTransformBox,
  RemoveTransformBox,
  StartTransformBoxEdit,
} from "../commands";
import { Intersect, TransformBoxStateSingleton } from "../singletons";
import { TransformBoxState } from "../types";

/**
 * Selection changed event for transform box state machine.
 */
interface SelectionChangedEvent {
  type: "selectionChanged";
  ctx: Context;
  selectedEntityIds: EntityId[];
}

/**
 * Extended pointer input with intersection data.
 */
interface TransformBoxPointerEvent extends PointerInput {
  intersects: EntityId[];
}

/**
 * Union of events the transform box machine handles.
 */
type TransformBoxEvent = SelectionChangedEvent | TransformBoxPointerEvent;

/**
 * Transform box state machine - created once at module level.
 *
 * The ECS context is available on events (ctx property) so actions
 * can access entities and other ECS state without recreating the machine.
 *
 * This machine manages the lifecycle of the transform box:
 * - None: No selection, no transform box
 * - Idle: Selection exists, transform box is visible
 * - Editing: Editing mode (e.g., text editing in a selected block)
 */
const transformBoxMachine = setup({
  types: {
    events: {} as TransformBoxEvent,
  },
  guards: {
    isSelectionEditable: ({ event }) => {
      if (!("selectedEntityIds" in event)) return false;
      if (event.selectedEntityIds.length !== 1) return false;

      // TODO: Check if the block type is editable
      // For now, allow editing any single selection
      const entityId = event.selectedEntityIds[0];
      if (!entityId) return false;

      const block = Block.read(event.ctx, entityId);
      // In the future, check blockDef.editOptions.canEdit
      return block.tag !== ""; // Simple check - has a tag
    },
    isOverTransformBox: ({ event }) => {
      if (!("intersects" in event)) return false;
      const intersectId = event.intersects[0];
      if (!intersectId) return false;
      return hasComponent(event.ctx, intersectId, TransformBox);
    },
    isOverTransformHandle: ({ event }) => {
      if (!("intersects" in event)) return false;
      const intersectId = event.intersects[0];
      if (!intersectId) return false;
      return hasComponent(event.ctx, intersectId, TransformHandle);
    },
    selectionIsTransformable: ({ event }) => {
      if (!("selectedEntityIds" in event)) return false;
      if (event.selectedEntityIds.length > 1) return true;
      if (event.selectedEntityIds.length === 0) return false;

      // TODO: Check if single block allows transform (resizeMode !== 'groupOnly')
      return true;
    },
  },
  actions: {
    addOrUpdateTransformBox: ({ event }) => {
      const ctx = "ctx" in event ? event.ctx : undefined;
      if (ctx) AddOrUpdateTransformBox.spawn(ctx, undefined);
    },
    updateTransformBox: ({ event }) => {
      const ctx = "ctx" in event ? event.ctx : undefined;
      if (ctx) UpdateTransformBox.spawn(ctx, undefined);
    },
    hideTransformBox: ({ event }) => {
      const ctx = "ctx" in event ? event.ctx : undefined;
      if (ctx) HideTransformBox.spawn(ctx, undefined);
    },
    showTransformBox: ({ event }) => {
      const ctx = "ctx" in event ? event.ctx : undefined;
      if (ctx) ShowTransformBox.spawn(ctx, undefined);
    },
    removeTransformBox: ({ event }) => {
      const ctx = "ctx" in event ? event.ctx : undefined;
      if (ctx) RemoveTransformBox.spawn(ctx, undefined);
    },
    startTransformBoxEdit: ({ event }) => {
      const ctx = "ctx" in event ? event.ctx : undefined;
      if (ctx) StartTransformBoxEdit.spawn(ctx, undefined);
    },
  },
}).createMachine({
  id: "transformBox",
  initial: TransformBoxState.None,
  states: {
    [TransformBoxState.None]: {
      entry: "removeTransformBox",
      on: {
        selectionChanged: [
          {
            guard: "selectionIsTransformable",
            target: TransformBoxState.Idle,
          },
        ],
      },
    },
    [TransformBoxState.Idle]: {
      entry: "addOrUpdateTransformBox",
      on: {
        selectionChanged: [
          {
            guard: not("selectionIsTransformable"),
            target: TransformBoxState.None,
          },
          {
            actions: "updateTransformBox",
          },
        ],
        pointerDown: {
          actions: "hideTransformBox",
        },
        pointerUp: {
          actions: "showTransformBox",
        },
        click: {
          guard: and(["isOverTransformBox", "isSelectionEditable"]),
          target: TransformBoxState.Editing,
        },
      },
    },
    [TransformBoxState.Editing]: {
      entry: ["startTransformBoxEdit", "hideTransformBox"],
      on: {
        pointerDown: {
          guard: and([not("isOverTransformBox"), not("isOverTransformHandle")]),
          target: TransformBoxState.None,
        },
      },
    },
  },
});

/**
 * Extend PointerInput with intersection data for transform box events.
 */
function extendTransformBoxPointerEvent(
  ctx: Context,
  event: PointerInput
): TransformBoxPointerEvent {
  return {
    ...event,
    intersects: Intersect.getAll(ctx),
  };
}

// Query for selected blocks with change tracking
const selectedBlocksQuery = defineQuery((q) =>
  q.with(Block).with(Selected).tracking(Selected)
);

/**
 * Transform box capture system - manages transform box lifecycle.
 *
 * Handles:
 * - Creating/updating transform box when selection changes
 * - Showing/hiding transform box during pointer interactions
 * - Transitioning to edit mode on click
 */
export const transformBoxCaptureSystem = defineSystem((ctx) => {
  const events: TransformBoxEvent[] = [];

  // Check for selection changes
  const added = selectedBlocksQuery.added(ctx);
  const removed = selectedBlocksQuery.removed(ctx);

  if (added.length > 0 || removed.length > 0) {
    const current = selectedBlocksQuery.current(ctx);
    const selectedEntityIds = Array.from(current);

    const selectionEvent: SelectionChangedEvent = {
      type: "selectionChanged",
      ctx,
      selectedEntityIds,
    };
    events.push(selectionEvent);
  }

  // Get pointer events for select tool
  const buttons = Controls.getButtons(ctx, "select");
  const rawEvents = getPointerInput(ctx, buttons);

  // Extend pointer events with intersection data
  for (const e of rawEvents) {
    events.push(extendTransformBoxPointerEvent(ctx, e));
  }

  if (events.length === 0) return;

  // Run machine through events - TransformBoxStateSingleton.run() handles
  // reading current state, running the machine, and writing back
  TransformBoxStateSingleton.run(ctx, transformBoxMachine, events);
});
