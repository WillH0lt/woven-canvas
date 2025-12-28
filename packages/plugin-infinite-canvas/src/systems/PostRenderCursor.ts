import {
  type Context,
  defineSystem,
  defineQuery,
} from "@infinitecanvas/editor";
import { Cursor } from "../singletons";

// Default cursor when no tool is active
const DEFAULT_CURSOR = "default";

const cursorQuery = defineQuery((q) => q.tracking(Cursor));

/**
 * Post-render cursor system - applies the current cursor to the DOM.
 *
 * Runs after rendering to update document.body.style.cursor based on:
 * 1. contextSvg (hover cursor) - highest priority
 * 2. Tool cursor - medium priority
 * 3. Default cursor - fallback
 *
 * This is separated from CaptureHoverCursor to ensure cursor is always
 * applied at the right time in the frame lifecycle.
 */
export const PostRenderCursor = defineSystem((ctx: Context) => {
  const changedCursors = cursorQuery.changed(ctx);

  // If no cursor changes, skip updating DOM
  if (changedCursors.length === 0) {
    return;
  }

  const cursor = Cursor.read(ctx);

  // TODO: Get tool cursor from tool definition when tools are implemented
  // For now, use default cursor as the tool cursor
  const toolCursor = DEFAULT_CURSOR;

  // Priority: contextSvg > toolCursor > DEFAULT_CURSOR
  const svg = cursor.contextSvg || cursor.svg || toolCursor;

  // Apply to DOM
  document.body.style.cursor = svg;
});
