import { field, defineEditorState } from "@infinitecanvas/editor";
import { TransformBoxState } from "../types";

/**
 * Transform box state singleton - stores the current state of the transform box state machine.
 *
 * Manages transform box lifecycle (none, idle, editing).
 * Used by the transform box capture system to run the transform box XState machine.
 *
 * Schema fields map to the original core TransformBoxState component:
 * - state: Current state machine state
 * - dragStart: Drag start position in world coordinates [x, y]
 * - pointingStartClient: Pointing start in client/screen coordinates [x, y]
 * - pointingStartWorld: Pointing start in world coordinates [x, y]
 * - draggedEntityStart: Dragged entity's original position [x, y]
 * - draggedEntityId: Entity ID of transform handle being dragged (0 = none)
 *
 * @example
 * ```typescript
 * // In a capture system:
 * const events = getPointerInput(ctx, ["left"]);
 * if (events.length > 0) {
 *   TransformBoxStateSingleton.run(ctx, transformBoxMachine, events);
 * }
 * ```
 */
export const TransformBoxStateSingleton = defineEditorState({
  state: field.string().max(32).default(TransformBoxState.None),
  dragStart: field.tuple(field.float64(), 2).default([0, 0]),
  pointingStartClient: field.tuple(field.float64(), 2).default([0, 0]),
  pointingStartWorld: field.tuple(field.float64(), 2).default([0, 0]),
  draggedEntityStart: field.tuple(field.float64(), 2).default([0, 0]),
  draggedEntityId: field.uint32().default(0),
});
