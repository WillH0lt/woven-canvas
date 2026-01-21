import { type Context, getResources, defineQuery } from "@infinitecanvas/ecs";

import { defineEditorSystem } from "../../EditorSystem";
import { on, Undo, Redo } from "../../command";
import type { EditorResources } from "../../types";

/**
 * Undo/Redo system - handles undo/redo commands.
 *
 * Listens for Undo and Redo commands and calls the corresponding
 * methods on the store if available.
 *
 * Note: Undo/Redo is skipped when any entity has the Edited component,
 * allowing the text editor to handle its own undo/redo.
 */
export const undoRedoSystem = defineEditorSystem(
  { phase: "update" },
  (ctx: Context) => {
    const { store } = getResources<EditorResources>(ctx);

    // Handle Undo command
    on(ctx, Undo, () => {
      if (store?.canUndo?.()) {
        store.undo?.();
      }
    });

    // Handle Redo command
    on(ctx, Redo, () => {
      if (store?.canRedo?.()) {
        store.redo?.();
      }
    });
  },
);
