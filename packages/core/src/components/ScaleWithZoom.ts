import { field } from "@woven-ecs/core";
import { defineCanvasComponent } from "@woven-ecs/canvas-store";

/**
 * ScaleWithZoom component - marks an entity that should maintain
 * screen-space size when the camera zooms.
 *
 * Used for transform handles so they remain a consistent size
 * regardless of zoom level.
 */
export const ScaleWithZoom = defineCanvasComponent(
  { name: "scaleWithZoom" },
  {
    /** Pivot point for scaling as [x, y] (0-1, default 0.5,0.5 = center) */
    anchor: field.tuple(field.float64(), 2).default([0.5, 0.5]),
    /** Initial position as [left, top] at zoom=1 */
    startPosition: field.tuple(field.float64(), 2).default([0, 0]),
    /** Initial size as [width, height] at zoom=1 */
    startSize: field.tuple(field.float64(), 2).default([0, 0]),
    /** Scale multiplier per dimension: [x, y] (0 = no zoom effect, 1 = full zoom effect, 0.5 = half effect) */
    scaleMultiplier: field.tuple(field.float64(), 2).default([1, 1]),
  }
);
