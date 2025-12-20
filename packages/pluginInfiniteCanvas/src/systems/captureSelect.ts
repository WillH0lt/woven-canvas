import { assign, and, not, setup } from "xstate";
import { Vec2 as Vec2Ns } from "@infinitecanvas/math";
import {
  type Context,
  type EntityId,
  type PointerInput,
  type InferStateContext,
  defineSystem,
  Controls,
  getPointerInput,
  hasComponent,
} from "@infinitecanvas/editor";

import { Block, Locked, Persistent, Selected, TransformBox } from "../components";
import {
  SelectBlock,
  DeselectAll,
  ToggleSelect,
  DragBlock,
  CloneEntities,
  UncloneEntities,
  SetCursor,
  AddSelectionBox,
  UpdateSelectionBox,
  RemoveSelectionBox,
} from "../commands";
import { Intersect, SelectionStateSingleton } from "../singletons";
import { SelectionState } from "../types";

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4;

/**
 * Extended pointer input with intersection data from the Intersect singleton.
 */
export interface SelectionPointerEvent extends PointerInput {
  /** Entity IDs at the pointer position, sorted by z-order (topmost first) */
  intersects: EntityId[];
}

/**
 * Selection state machine context - derived from SelectionStateSingleton schema.
 */
type SelectionContext = InferStateContext<typeof SelectionStateSingleton>;

/**
 * Get a simple cursor SVG for dragging
 */
function getDragCursorSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M13 6v15h-2V6H5l7-5 7 5z" fill="currentColor"/></svg>`;
}

/**
 * Selection state machine - created once at module level.
 *
 * The ECS context is available on events (ctx property) so actions
 * can access entities and other ECS state without recreating the machine.
 *
 * This machine handles:
 * - Clicking to select blocks
 * - Dragging blocks to move them
 * - Alt+drag to clone blocks
 * - Shift+click to toggle selection
 * - Selection box (marquee) for multi-select
 */
const selectionMachine = setup({
  types: {
    context: {} as SelectionContext,
    events: {} as SelectionPointerEvent,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      const dist = Vec2Ns.distance(context.pointingStartClient, event.screenPosition);
      return dist >= POINTING_THRESHOLD;
    },
    isOverBlock: ({ event }) => {
      return event.intersects.length > 0 && event.intersects[0] !== 0;
    },
    isOverPersistentBlock: ({ event }) => {
      const ctx = event.ctx;
      for (const entityId of event.intersects) {
        if (entityId && hasComponent(ctx, entityId, Persistent)) {
          return true;
        }
      }
      return false;
    },
    draggedEntityIsLocked: ({ context, event }) => {
      if (!context.draggedEntityId) return false;
      return hasComponent(event.ctx, context.draggedEntityId, Locked);
    },
  },
  actions: {
    setPointingStart: assign({
      pointingStartClient: ({ event }) => event.screenPosition,
      pointingStartWorld: ({ event }) => event.worldPosition,
    }),
    setDragStart: assign({
      dragStart: ({ event }) => event.worldPosition,
    }),
    setDragCursor: ({ event }) => {
      SetCursor.spawn(event.ctx, { contextSvg: getDragCursorSvg() });
    },
    unsetDragCursor: ({ event }) => {
      SetCursor.spawn(event.ctx, { contextSvg: "" });
    },
    setDraggedEntity: assign({
      draggedEntityId: ({ event }) => event.intersects[0] || 0,
      draggedEntityStart: ({ event }): [number, number] => {
        const entityId = event.intersects[0];
        if (!entityId) return [0, 0];
        const block = Block.read(event.ctx, entityId);
        return [block.position[0], block.position[1]];
      },
    }),
    resetDragged: ({ context, event }) => {
      if (!context.draggedEntityId) return;

      // Reset block to original position
      DragBlock.spawn(event.ctx, {
        entityId: context.draggedEntityId,
        position: context.draggedEntityStart,
      });

      // Unclone if we were cloning
      if (context.isCloning) {
        UncloneEntities.spawn(event.ctx, {
          entityIds: [context.draggedEntityId],
          seed: context.cloneGeneratorSeed,
        });
      }
    },
    resetContext: assign({
      dragStart: (): [number, number] => [0, 0],
      pointingStartClient: (): [number, number] => [0, 0],
      pointingStartWorld: (): [number, number] => [0, 0],
      draggedEntityStart: (): [number, number] => [0, 0],
      draggedEntityId: () => 0 as EntityId,
      cloneGeneratorSeed: () => crypto.randomUUID(),
      isCloning: () => false,
    }),
    createSelectionBox: ({ event }) => {
      AddSelectionBox.spawn(event.ctx, undefined);
    },
    removeSelectionBox: ({ event }) => {
      RemoveSelectionBox.spawn(event.ctx, undefined);
    },
    updateDragged: assign({
      isCloning: ({ context, event }) => {
        const ctx = event.ctx;
        if (!context.draggedEntityId) return false;

        let left = context.draggedEntityStart[0] + event.worldPosition[0] - context.dragStart[0];
        let top = context.draggedEntityStart[1] + event.worldPosition[1] - context.dragStart[1];

        const draggingPersistent =
          hasComponent(ctx, context.draggedEntityId, Persistent) ||
          hasComponent(ctx, context.draggedEntityId, TransformBox);

        // Shift constrains movement to axis
        if (event.shiftDown && draggingPersistent) {
          const dx = Math.abs(event.worldPosition[0] - context.dragStart[0]);
          const dy = Math.abs(event.worldPosition[1] - context.dragStart[1]);
          if (dx > dy) {
            top = context.draggedEntityStart[1];
          } else {
            left = context.draggedEntityStart[0];
          }
        }

        // Move the block
        DragBlock.spawn(ctx, {
          entityId: context.draggedEntityId,
          position: [left, top],
        });

        // Alt+drag to clone
        let isCloning = context.isCloning;
        if (event.altDown && draggingPersistent && !context.isCloning) {
          const block = Block.read(ctx, context.draggedEntityId);
          const dx = context.draggedEntityStart[0] - block.position[0];
          const dy = context.draggedEntityStart[1] - block.position[1];

          isCloning = true;

          CloneEntities.spawn(ctx, {
            entityIds: [context.draggedEntityId],
            offset: [dx, dy],
            seed: context.cloneGeneratorSeed,
          });
        } else if (!event.altDown && context.isCloning) {
          // Alt released - unclone
          UncloneEntities.spawn(ctx, {
            entityIds: [context.draggedEntityId],
            seed: context.cloneGeneratorSeed,
          });
          isCloning = false;
        }

        return isCloning;
      },
    }),
    resizeSelectionBox: ({ context, event }) => {
      const left = Math.min(context.pointingStartWorld[0], event.worldPosition[0]);
      const top = Math.min(context.pointingStartWorld[1], event.worldPosition[1]);
      const right = Math.max(context.pointingStartWorld[0], event.worldPosition[0]);
      const bottom = Math.max(context.pointingStartWorld[1], event.worldPosition[1]);

      UpdateSelectionBox.spawn(event.ctx, {
        bounds: [left, top, right, bottom],
        deselectOthers: !event.shiftDown,
      });
    },
    selectIntersect: ({ event }) => {
      const ctx = event.ctx;
      let intersectId: EntityId | undefined;

      for (const entityId of event.intersects) {
        if (entityId && hasComponent(ctx, entityId, Persistent)) {
          intersectId = entityId;
          break;
        }
      }

      if (!intersectId) return;

      if (event.shiftDown) {
        ToggleSelect.spawn(ctx, { entityId: intersectId });
      } else {
        SelectBlock.spawn(ctx, { entityId: intersectId, deselectOthers: true });
      }
    },
    selectDragged: ({ context, event }) => {
      if (!context.draggedEntityId) return;
      if (!hasComponent(event.ctx, context.draggedEntityId, Persistent)) return;
      SelectBlock.spawn(event.ctx, {
        entityId: context.draggedEntityId,
        deselectOthers: true,
      });
    },
    deselectAllIfShiftNotDown: ({ event }) => {
      if (event.shiftDown) return;
      DeselectAll.spawn(event.ctx, undefined);
    },
    deselectAllIfDraggedNotSelected: ({ context, event }) => {
      if (!context.draggedEntityId) return;
      if (hasComponent(event.ctx, context.draggedEntityId, Selected)) return;
      DeselectAll.spawn(event.ctx, undefined);
    },
  },
}).createMachine({
  id: "selection",
  initial: SelectionState.Idle,
  context: {
    dragStart: [0, 0],
    pointingStartClient: [0, 0],
    pointingStartWorld: [0, 0],
    draggedEntityStart: [0, 0],
    draggedEntityId: 0 as EntityId,
    cloneGeneratorSeed: crypto.randomUUID(),
    isCloning: false,
  },
  states: {
    [SelectionState.Idle]: {
      entry: ["resetContext"],
      on: {
        pointerDown: [
          {
            guard: "isOverBlock",
            target: SelectionState.Pointing,
          },
          {
            actions: "deselectAllIfShiftNotDown",
            target: SelectionState.SelectionBoxPointing,
          },
        ],
      },
    },
    [SelectionState.Pointing]: {
      entry: ["setPointingStart", "setDraggedEntity"],
      on: {
        pointerMove: {
          guard: and(["isThresholdReached", not("draggedEntityIsLocked")]),
          target: SelectionState.Dragging,
        },
        pointerUp: [
          {
            guard: "isOverPersistentBlock",
            actions: "selectIntersect",
            target: SelectionState.Idle,
          },
          {
            actions: "deselectAllIfShiftNotDown",
            target: SelectionState.Idle,
          },
        ],
        cancel: {
          target: SelectionState.Idle,
        },
      },
    },
    [SelectionState.Dragging]: {
      entry: ["setDragStart", "setDragCursor", "deselectAllIfDraggedNotSelected"],
      exit: ["unsetDragCursor"],
      on: {
        pointerMove: {
          actions: "updateDragged",
        },
        pointerUp: {
          actions: ["selectDragged"],
          target: SelectionState.Idle,
        },
        cancel: {
          actions: "resetDragged",
          target: SelectionState.Idle,
        },
      },
    },
    [SelectionState.SelectionBoxPointing]: {
      entry: ["setPointingStart"],
      on: {
        pointerMove: {
          guard: "isThresholdReached",
          target: SelectionState.SelectionBoxDragging,
        },
        pointerUp: {
          target: SelectionState.Idle,
        },
        cancel: {
          target: SelectionState.Idle,
        },
      },
    },
    [SelectionState.SelectionBoxDragging]: {
      entry: ["setDragStart", "createSelectionBox"],
      exit: "removeSelectionBox",
      on: {
        pointerMove: {
          actions: "resizeSelectionBox",
        },
        pointerUp: {
          target: SelectionState.Idle,
        },
        cancel: {
          target: SelectionState.Idle,
        },
      },
    },
  },
});

/**
 * Extend PointerInput with intersection data.
 */
function extendPointerEvent(
  ctx: Context,
  event: PointerInput
): SelectionPointerEvent {
  return {
    ...event,
    intersects: Intersect.getAll(ctx),
  };
}

/**
 * Selection capture system - runs the selection state machine.
 *
 * Handles pointer events for:
 * - Clicking to select blocks
 * - Dragging to move blocks
 * - Alt+drag to clone
 * - Shift+click to toggle selection
 * - Selection box (marquee) for multi-select
 */
export const selectCaptureSystem = defineSystem((ctx) => {
  // Get pointer buttons mapped to 'select' tool
  const buttons = Controls.getButtons(ctx, "select");

  // Get pointer events for those buttons
  const rawEvents = getPointerInput(ctx, buttons);
  if (rawEvents.length === 0) return;

  // Extend events with intersection data
  const events = rawEvents.map((e) => extendPointerEvent(ctx, e));

  // Run machine through events - SelectionStateSingleton.run() handles
  // reading current state, running the machine, and writing back
  SelectionStateSingleton.run(ctx, selectionMachine, events);
});
