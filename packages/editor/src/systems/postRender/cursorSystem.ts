import { type Context, defineSystem, defineQuery } from "@infinitecanvas/ecs";

import { Cursor } from "../../singletons";
import { getCursorSvg } from "../../cursors";
import { PLUGIN_NAME } from "../../constants";
import { type EditorResources, getPluginResources } from "../../types";

// Default cursor when no cursor kind is set
const DEFAULT_CURSOR = "default";

const cursorQuery = defineQuery((q) => q.tracking(Cursor));

/**
 * Post-render cursor system - applies the current cursor to the DOM.
 *
 * Runs after rendering to update document.body.style.cursor based on:
 * 1. contextCursorKind (hover/drag cursor) - highest priority
 * 2. cursorKind (tool cursor) - medium priority
 * 3. Default cursor - fallback
 *
 * Resolves cursor kind + rotation to SVG using getCursorSvg at render time,
 * allowing cursor definitions to be changed dynamically.
 */
export const cursorSystem = defineSystem((ctx: Context) => {
  const changedCursors = cursorQuery.changed(ctx);

  // If no cursor changes, skip updating DOM
  if (changedCursors.length === 0) {
    return;
  }

  const { cursorKind, rotation } = Cursor.getEffective(ctx);

  // If no cursor kind set, use default
  if (!cursorKind) {
    document.body.style.cursor = DEFAULT_CURSOR;
    return;
  }

  // Get cursors from resources and resolve to SVG
  const { editor } = getPluginResources<EditorResources>(ctx, PLUGIN_NAME);
  const cursorValue = getCursorSvg(editor.cursors, cursorKind, rotation);

  // Apply to DOM
  document.body.style.cursor = cursorValue;
});
