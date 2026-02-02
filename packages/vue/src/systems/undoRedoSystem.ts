import {
  defineEditorSystem,
  getPluginResources,
  on,
  Undo,
  Redo,
} from "@infinitecanvas/editor";
import type { BasicsPluginResources } from "../BasicsPlugin";

export const undoRedoSystem = defineEditorSystem({ phase: "update" }, (ctx) => {
  const { store } = getPluginResources<BasicsPluginResources>(ctx, "basics");
  on(ctx, Undo, () => {
    if (store.canUndo()) store.undo();
  });
  on(ctx, Redo, () => {
    if (store.canRedo()) store.redo();
  });
});
