import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * DragStart component - stores the initial transform state when a drag begins.
 *
 * Used to calculate deltas during drag operations and to restore
 * original position on cancel.
 */
export const DragStart = defineEditorComponent(
  { name: "dragStart" },
  {
    /** Initial position as [left, top] */
    position: field.tuple(field.float64(), 2).default([0, 0]),
    /** Initial size as [width, height] */
    size: field.tuple(field.float64(), 2).default([0, 0]),
    /** Initial rotation in radians */
    rotateZ: field.float64().default(0),
    /** Initial flip state as [flipX, flipY] */
    flip: field.tuple(field.boolean(), 2).default([false, false]),
    /** Initial font size */
    fontSize: field.float64().default(16),
  }
);
