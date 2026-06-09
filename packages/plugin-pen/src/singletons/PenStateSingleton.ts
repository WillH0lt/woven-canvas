import { defineEditorState, field } from '@woven-canvas/core'
import { PenState } from '../types'

/**
 * Pen state singleton - stores the current state of the pen state machine.
 *
 * Tracks the pen tool state and active stroke entity for the current session.
 *
 * @example
 * ```typescript
 * // In a capture system:
 * const events = getPointerInput(ctx, ["left"]);
 * if (events.length > 0) {
 *   PenStateSingleton.run(ctx, penMachine, events);
 * }
 * ```
 */
export const PenStateSingleton = defineEditorState('penState', {
  /** Current state machine state */
  state: field.string().max(16).default(PenState.Idle),

  /** Reference to the active pen stroke entity (while drawing) */
  activeStroke: field.ref(),

  /** Last pointer position in world coordinates [x, y] */
  lastWorldPosition: field.tuple(field.float64(), 2).default([0, 0]),

  /**
   * Unit direction of the active "sleeve" used by the live point simplifier
   * (see {@link updatePenSystem}). While drawing, the provisional tail point is
   * kept collinear with this direction until the cursor deviates far enough to
   * commit a new vertex. `[0, 0]` means no direction has been established yet
   * (start of stroke, or just after committing a vertex). Transient draw state.
   */
  sleeveDir: field.tuple(field.float64(), 2).default([0, 0]),
})
