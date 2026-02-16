import { defineEditorState, field } from '@woven-canvas/core'
import { TransformBoxState } from '../types'

/**
 * Transform box state singleton - stores the current state of the transform box state machine.
 *
 * Tracks:
 * - state: Current state machine state (None, Idle, Editing)
 * - transformBoxId: Entity ID of the transform box (null when no transform box exists)
 */
export const TransformBoxStateSingleton = defineEditorState('transformBoxState', {
  state: field.string().max(32).default(TransformBoxState.None),
  transformBoxId: field.ref(),
})
