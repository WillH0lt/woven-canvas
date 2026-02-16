import { defineEditorState, field } from '@infinitecanvas/core'
import { EraserState } from '../types'

/**
 * Eraser state singleton - stores the current state of the eraser state machine.
 *
 * Tracks the eraser tool state and active stroke entity for the current session.
 *
 * @example
 * ```typescript
 * // In a capture system:
 * const events = getPointerInput(ctx, ["left"]);
 * if (events.length > 0) {
 *   EraserStateSingleton.run(ctx, eraserMachine, events);
 * }
 * ```
 */
export const EraserStateSingleton = defineEditorState('eraserState', {
  /** Current state machine state */
  state: field.string().max(16).default(EraserState.Idle),

  /** Reference to the active eraser stroke entity (while erasing) */
  activeStroke: field.ref(),

  /** Last pointer position in world coordinates [x, y] */
  lastWorldPosition: field.tuple(field.float64(), 2).default([0, 0]),
})
