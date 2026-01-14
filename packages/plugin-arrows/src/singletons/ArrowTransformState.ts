import { field, defineEditorState } from "@infinitecanvas/editor";
import { ArrowTransformStateEnum } from "../types";

/**
 * Arrow transform state singleton - stores the current state of the arrow transform state machine.
 *
 * Tracks the transform tool state and active arrow entity while editing existing arrows.
 *
 * @example
 * ```typescript
 * // In a capture system:
 * const events = getSelectionEvents(ctx);
 * if (events.length > 0) {
 *   ArrowTransformState.run(ctx, arrowTransformMachine, events);
 * }
 * ```
 */
export const ArrowTransformState = defineEditorState("arrowTransformState", {
  /** Current state machine state */
  state: field.string().max(16).default(ArrowTransformStateEnum.None),

  /** Reference to the active arrow entity (while transforming) */
  activeArrow: field.ref(),
});
