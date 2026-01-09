import { defineCommand, type EntityId } from "@infinitecanvas/editor";
import type { Vec2 } from "@infinitecanvas/math";

/**
 * Start a new eraser stroke at the given world position.
 * Creates a new EraserStroke entity and begins tracking intersections.
 */
export const StartEraserStroke = defineCommand<{
  worldPosition: Vec2;
}>("start-eraser-stroke");

/**
 * Add a point to the active eraser stroke.
 * Updates the stroke geometry and checks for new intersections.
 */
export const AddEraserStrokePoint = defineCommand<{
  worldPosition: Vec2;
}>("add-eraser-stroke-point");

/**
 * Complete the eraser stroke and delete all intersected entities.
 * Removes the stroke entity and all entities marked as Erased.
 */
export const CompleteEraserStroke = defineCommand<{
  strokeId: EntityId;
}>("complete-eraser-stroke");

/**
 * Cancel the eraser stroke without deleting any entities.
 * Removes the stroke entity and restores all Erased entities.
 */
export const CancelEraserStroke = defineCommand<{
  strokeId: EntityId;
}>("cancel-eraser-stroke");

/**
 * Mark an entity as erased by the active stroke.
 * Used internally by the eraser update system.
 */
export const MarkAsErased = defineCommand<{
  entityId: EntityId;
  strokeId: EntityId;
}>("mark-as-erased");
