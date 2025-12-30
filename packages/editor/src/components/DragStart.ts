import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "../EditorComponentDef";

/**
 * DragStart component - stores the initial transform state when a drag begins.
 *
 * Used to calculate deltas during drag operations and to restore
 * original position on cancel.
 */
export const DragStart = defineEditorComponent(
  "dragStart",
  {
    /** Initial position as [left, top] */
    position: field.tuple(field.float64(), 2).default([0, 0]),
    /** Initial size as [width, height] */
    size: field.tuple(field.float64(), 2).default([0, 0]),
    /** Initial rotation in radians */
    rotateZ: field.float64().default(0),
    /** Initial font size */
    fontSize: field.float64().default(16),
  },
  { sync: "none" }
);
