import { assign, and, not, setup } from "xstate";
import {
  type Context,
  type EntityId,
  type InferStateContext,
  defineEditorSystem,
  defineQuery,
  Controls,
  hasComponent,
  removeComponent,
  createEntity,
  Block,
  getPointerInput,
  canBlockEdit,
  getBlockDef,
  type PointerInput,
} from "@infinitecanvas/editor";

import {
  TransformBox,
  TransformHandle,
  Selected,
  EditAfterPlacing,
} from "../../components";
import {
  AddTransformBox,
  UpdateTransformBox,
  HideTransformBox,
  ShowTransformBox,
  RemoveTransformBox,
  StartTransformBoxEdit,
} from "../../commands";
import { TransformBoxStateSingleton } from "../../singletons";
import { TransformBoxState } from "../../types";
import { getLocalSelectedBlocks } from "../../helpers";

/**
 * Selection changed event for transform box state machine.
 */
interface SelectionChangedEvent {
  type: "selectionChanged";
  ctx: Context;
  selectedEntityIds: EntityId[];
}

/**
 * Union of events the transform box machine handles.
 */
type TransformBoxEvent = SelectionChangedEvent | PointerInput;

/**
 * Transform box state machine context - derived from TransformBoxStateSingleton schema.
 */
type TransformBoxContext = InferStateContext<typeof TransformBoxStateSingleton>;

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
    context: {} as TransformBoxContext,
    events: {} as TransformBoxEvent,
  },
  guards: {
    isSelectionEditable: ({ event }) => {
      // Read current selection state, not from event
      // This matches the core implementation which queries current selection
      return checkSelectionEditable(event.ctx);
    },
    isOverTransformBox: ({ event }) => {
      if (!("intersects" in event)) return false;
      if (event.intersects.length === 0) return false;
      return hasComponent(event.ctx, event.intersects[0], TransformBox);
    },
    isOverTransformHandle: ({ event }) => {
      if (!("intersects" in event)) return false;
      if (event.intersects.length === 0) return false;
      return hasComponent(event.ctx, event.intersects[0], TransformHandle);
    },
    selectionIsTransformable: ({ event }) => {
      if (event.type !== "selectionChanged") return false;
      if (event.selectedEntityIds.length > 1) return true;
      if (event.selectedEntityIds.length === 0) return false;

      // Check if single block allows transform (resizeMode !== 'groupOnly')
      const entityId = event.selectedEntityIds[0];
      const block = Block.read(event.ctx, entityId);
      const blockDef = getBlockDef(event.ctx, block.tag);
      return blockDef.resizeMode !== "groupOnly";
    },
    hasEditAfterPlacing: ({ event }) => {
      if (event.type !== "selectionChanged") return false;
      if (event.selectedEntityIds.length !== 1) return false;
      return hasComponent(
        event.ctx,
        event.selectedEntityIds[0],
        EditAfterPlacing,
      );
    },
  },
  actions: {
    addTransformBox: assign(
      ({ context, event }, params?: { skipHandles?: boolean }) => {
        // If we already have a transform box, reuse it
        if (context.transformBoxId !== null) {
          return { transformBoxId: context.transformBoxId };
        }

        // Create a new entity for the transform box
        const transformBoxId = createEntity(event.ctx);

        AddTransformBox.spawn(event.ctx, {
          transformBoxId,
          skipHandles: params?.skipHandles,
        });

        return { transformBoxId };
      },
    ),
    updateTransformBox: ({ context, event }) => {
      if (context.transformBoxId === null) return;
      UpdateTransformBox.spawn(event.ctx, {
        transformBoxId: context.transformBoxId,
      });
    },
    hideTransformBox: ({ context, event }) => {
      if (context.transformBoxId === null) return;
      HideTransformBox.spawn(event.ctx, {
        transformBoxId: context.transformBoxId,
      });
    },
    showTransformBox: ({ context, event }) => {
      if (context.transformBoxId === null) return;
      ShowTransformBox.spawn(event.ctx, {
        transformBoxId: context.transformBoxId,
      });
    },
    removeTransformBox: ({ context, event }) => {
      if (context.transformBoxId === null) return;
      RemoveTransformBox.spawn(event.ctx, {
        transformBoxId: context.transformBoxId,
      });
    },
    clearTransformBoxId: assign({
      transformBoxId: () => null,
    }),
    startTransformBoxEdit: ({ context, event }) => {
      if (context.transformBoxId === null) return;
      StartTransformBoxEdit.spawn(event.ctx, {
        transformBoxId: context.transformBoxId,
      });
    },
    removeEditAfterPlacing: ({ event }) => {
      for (const entityId of getLocalSelectedBlocks(event.ctx)) {
        if (hasComponent(event.ctx, entityId, EditAfterPlacing)) {
          removeComponent(event.ctx, entityId, EditAfterPlacing);
        }
      }
    },
  },
}).createMachine({
  id: "transformBox",
  initial: TransformBoxState.None,
  context: {
    transformBoxId: null,
  },
  states: {
    [TransformBoxState.None]: {
      entry: ["removeTransformBox", "clearTransformBoxId"],
      on: {
        selectionChanged: [
          {
            guard: and([
              "hasEditAfterPlacing",
              "selectionIsTransformable",
              "isSelectionEditable",
            ]),
            actions: [
              { type: "addTransformBox", params: { skipHandles: true } },
              "removeEditAfterPlacing",
            ],
            target: TransformBoxState.Editing,
          },
          {
            guard: "selectionIsTransformable",
            target: TransformBoxState.Idle,
          },
        ],
      },
    },
    [TransformBoxState.Idle]: {
      entry: ["addTransformBox"],
      on: {
        selectionChanged: [
          {
            guard: not("selectionIsTransformable"),
            target: TransformBoxState.None,
          },
          {
            guard: "selectionIsTransformable",
            actions: "showTransformBox",
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
      entry: ["hideTransformBox", "startTransformBoxEdit"],
      on: {
        pointerDown: {
          guard: and([not("isOverTransformBox"), not("isOverTransformHandle")]),
          target: TransformBoxState.None,
        },
      },
    },
  },
});

// Query for selected blocks with change tracking
const selectedBlocksQuery = defineQuery((q) =>
  q.with(Block).tracking(Selected),
);

/**
 * Check if the current selection is editable.
 * Used by the isSelectionEditable guard - reads current state, not event.
 * Only considers blocks selected by the current session.
 */
function checkSelectionEditable(ctx: Context): boolean {
  const selectedEntities = getLocalSelectedBlocks(ctx);

  if (selectedEntities.length !== 1) return false;

  const entityId = selectedEntities[0];
  const block = Block.read(ctx, entityId);

  return canBlockEdit(ctx, block.tag);
}

/**
 * Transform box capture system - manages transform box lifecycle.
 *
 * Handles:
 * - Creating/updating transform box when selection changes
 * - Showing/hiding transform box during pointer interactions
 * - Transitioning to edit mode on click
 */
export const transformBoxSystem = defineEditorSystem(
  { phase: "capture" },
  (ctx) => {
    const events: TransformBoxEvent[] = [];

    // Check for selection changes
    const added = selectedBlocksQuery.added(ctx);
    const removed = selectedBlocksQuery.removed(ctx);

    if (added.length > 0 || removed.length > 0) {
      // Only include blocks selected by the current session
      const selectedEntityIds = getLocalSelectedBlocks(ctx);

      const selectionEvent: SelectionChangedEvent = {
        type: "selectionChanged",
        ctx,
        selectedEntityIds,
      };
      events.push(selectionEvent);
    }

    // Get pointer events with intersection data for select tool
    const buttons = Controls.getButtons(ctx, "select");
    const pointerEvents = getPointerInput(ctx, buttons);
    events.push(...pointerEvents);

    if (events.length === 0) return;

    // Run machine through events - TransformBoxStateSingleton.run() handles
    // reading current state, running the machine, and writing back
    TransformBoxStateSingleton.run(ctx, transformBoxMachine, events);
  },
);
