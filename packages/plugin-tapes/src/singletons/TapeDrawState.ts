import { defineEditorState, field } from '@woven-canvas/core'
import { TapeDrawStateEnum } from '../types'

/**
 * Tape draw state singleton - stores the current state of the tape draw state machine.
 *
 * Tracks the drawing tool state and active tape entity while drawing new tape.
 */
export const TapeDrawState = defineEditorState('tapeDrawState', {
  /** Current state machine state */
  state: field.string().max(16).default(TapeDrawStateEnum.Idle),

  /** Reference to the active tape entity (while drawing) */
  activeTape: field.ref(),

  /** Pointing start position in client coordinates [x, y] */
  pointingStartClient: field.tuple(field.int32(), 2).default([0, 0]),

  /** Pointing start position in world coordinates [x, y] */
  pointingStartWorld: field.tuple(field.float64(), 2).default([0, 0]),
})
