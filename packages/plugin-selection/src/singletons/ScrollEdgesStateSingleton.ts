import { defineEditorState, field } from '@woven-canvas/core'

import { ScrollEdgesState } from '../types'

/**
 * Scroll edges state singleton - stores the state machine state and context
 * for edge scrolling during drag operations.
 *
 * When dragging blocks or the selection box near the edge of the viewport,
 * the camera automatically scrolls in that direction after a brief delay.
 */
export const ScrollEdgesStateSingleton = defineEditorState('scrollEdgesState', {
  /** Current state of the scroll edges state machine */
  state: field.enum(ScrollEdgesState).default(ScrollEdgesState.Idle),
  /** Timestamp when pointer first entered the edge zone */
  edgeEnterStartTime: field.float64().default(0),
})
