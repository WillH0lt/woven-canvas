import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * ScaleWithZoom component - marks an entity that should maintain
 * screen-space size when the camera zooms.
 *
 * Used for transform handles so they remain a consistent size
 * regardless of zoom level.
 */
export const ScaleWithZoom = defineEditorComponent(
  "scaleWithZoom",
  {
    /** Pivot point for scaling as [x, y] (0-1, default 0.5,0.5 = center) */
    anchor: field.tuple(field.float64(), 2).default([0.5, 0.5]),
    /** Initial position as [left, top] at zoom=1 */
    position: field.tuple(field.float64(), 2).default([0, 0]),
    /** Initial size as [width, height] at zoom=1 */
    size: field.tuple(field.float64(), 2).default([0, 0]),
  },
  { sync: "none" }
);
