import { field, defineEditorState } from "@infinitecanvas/editor";
import { SelectionState } from "../types";

/**
 * Selection state singleton - stores the current state of the selection state machine.
 *
 * Tracks pointer interactions for selecting and dragging blocks.
 * Used by the selection capture system to run the selection XState machine.
 *
 * Schema fields map to the original core SelectionState component:
 * - state: Current state machine state
 * - dragStart: Drag start position in world coordinates [x, y]
 * - pointingStartClient: Pointing start in client/screen coordinates [x, y]
 * - pointingStartWorld: Pointing start in world coordinates [x, y]
 * - draggedEntityStart: Dragged entity's original position [x, y]
 * - draggedEntityId: Entity ID of block being dragged (0 = none)
 * - cloneGeneratorSeed: Seed for deterministic UUIDs when cloning
 * - isCloning: Whether in cloning mode (Alt+drag)
 *
 * @example
 * ```typescript
 * // In a capture system:
 * const events = getPointerInput(ctx, ["left"]);
 * if (events.length > 0) {
 *   SelectionStateSingleton.run(ctx, selectionMachine, events);
 * }
 * ```
 */
export const SelectionStateSingleton = defineEditorState({
  state: field.string().max(32).default(SelectionState.Idle),
  dragStart: field.tuple(field.float64(), 2).default([0, 0]),
  pointingStartClient: field.tuple(field.float64(), 2).default([0, 0]),
  pointingStartWorld: field.tuple(field.float64(), 2).default([0, 0]),
  draggedEntityStart: field.tuple(field.float64(), 2).default([0, 0]),
  draggedEntityId: field.uint32().default(0),
  cloneGeneratorSeed: field.string().max(36).default(""),
  isCloning: field.boolean().default(false),
});
