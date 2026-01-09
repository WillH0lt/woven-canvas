import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "../EditorComponentDef";

/**
 * Maximum number of capsules that can be stored in the hitCapsules array.
 * Each capsule takes 5 floats: ax, ay, bx, by, radius
 */
export const MAX_HIT_CAPSULES = 64;

/**
 * Number of floats per capsule in the hitCapsules array.
 */
export const FLOATS_PER_CAPSULE = 5;

/**
 * HitGeometry component - stores collision geometry for an entity.
 *
 * The hitCapsules buffer stores capsule data as a flat array of floats:
 * [ax0, ay0, bx0, by0, r0, ax1, ay1, bx1, by1, r1, ...]
 *
 * Each capsule is defined by:
 * - ax, ay: First endpoint of the capsule's center line
 * - bx, by: Second endpoint of the capsule's center line
 * - radius: The radius of the capsule
 *
 * Uses field.buffer for zero-allocation subarray views.
 * Used for collision detection with eraser strokes and other tools.
 */
export const HitGeometry = defineEditorComponent(
  "hit-geometry",
  {
    hitCapsules: field
      .buffer(field.float32())
      .size(MAX_HIT_CAPSULES * FLOATS_PER_CAPSULE),
    capsuleCount: field.uint16().default(0),
  },
  { sync: "document" }
);
