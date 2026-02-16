import {
  type Context,
  defineEditorSystem,
  defineQuery,
  Block,
  Hovered,
  Cursor,
} from "@infinitecanvas/core";

import { TransformHandle, TransformBox } from "../../components";

// Query for hovered entities that have transform handles
const hoveredHandleQuery = defineQuery((q) =>
  q.with(Hovered, TransformHandle).tracking(Hovered)
);

// Query for transform box - track Block changes for rotation updates
const transformBoxQuery = defineQuery((q) =>
  q.with(Block, TransformBox).tracking(Block)
);

/**
 * Capture hover cursor system - sets context cursor when hovering transform handles.
 *
 * Detects when the mouse hovers over transform handles and sets the appropriate
 * cursor (resize, rotate, etc.) based on the handle type and transform box rotation.
 *
 * Also updates cursor when the transform box rotation changes.
 *
 * Priority: contextSvg (hover) > svg (tool) > default
 */
export const hoverCursorSystem = defineEditorSystem({ phase: "capture" }, (ctx: Context) => {
  const addedHandles = hoveredHandleQuery.added(ctx);
  const removedHandles = hoveredHandleQuery.removed(ctx);
  const currentHandles = hoveredHandleQuery.current(ctx);
  const changedBoxes = transformBoxQuery.changed(ctx);

  // Clear context cursor when unhovering
  if (currentHandles.length === 0 && removedHandles.length > 0) {
    Cursor.clearContextCursor(ctx);
    return;
  }

  // Update cursor when handle is newly hovered or transform box rotation changes
  const shouldUpdate = addedHandles.length > 0 || changedBoxes.length > 0;
  if (shouldUpdate && currentHandles.length > 0) {
    // Use the first currently hovered handle
    const entityId = currentHandles[0];
    const handle = TransformHandle.read(ctx, entityId);
    if (handle.transformBox === null) return

    // Get rotation from the transform box, not the handle
    const transformBoxBlock = Block.read(ctx, handle.transformBox);

    // Only update if cursor kind or rotation changed
    const currentCursor = Cursor.read(ctx);
    if (
      handle.cursorKind !== currentCursor.contextCursorKind ||
      transformBoxBlock.rotateZ !== currentCursor.contextRotation
    ) {
      Cursor.setContextCursor(
        ctx,
        handle.cursorKind,
        transformBoxBlock.rotateZ
      );
    }
  }
});
