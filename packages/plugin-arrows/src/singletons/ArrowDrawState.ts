import { defineEditorState, field } from '@woven-canvas/core'
import { ArrowDrawStateEnum, ArrowKind } from '../types'

/**
 * Arrow draw state singleton - stores the current state of the arrow draw state machine.
 *
 * Tracks the drawing tool state and active arrow entity while creating new arrows.
 *
 * @example
 * ```typescript
 * // In a capture system:
 * const events = getPointerInput(ctx, buttons);
 * if (events.length > 0) {
 *   ArrowDrawState.run(ctx, arrowDrawMachine, events);
 * }
 * ```
 */
export const ArrowDrawState = defineEditorState('arrowDrawState', {
  /** Current state machine state */
  state: field.string().max(16).default(ArrowDrawStateEnum.Idle),

  /** Reference to the active arrow entity (while drawing) */
  activeArrow: field.ref(),

  /** Kind of arrow being drawn (arc or elbow) */
  kind: field.enum(ArrowKind).default(ArrowKind.Elbow),

  /** Pointing start position in client coordinates [x, y] */
  pointingStartClient: field.tuple(field.int32(), 2).default([0, 0]),

  /** Pointing start position in world coordinates [x, y] */
  pointingStartWorld: field.tuple(field.float64(), 2).default([0, 0]),
})
