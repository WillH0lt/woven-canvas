import { field } from '@woven-ecs/core'
import { defineEditorState } from '../EditorStateDef'
import { FrameContainmentStateEnum } from '../types'

/**
 * Frame containment state singleton - tracks the containment detection state machine.
 *
 * Monitors drag operations to detect when blocks are dropped into or out of frames.
 */
export const FrameContainmentState = defineEditorState('frameContainmentState', {
  /** Current state machine state */
  state: field.string().max(16).default(FrameContainmentStateEnum.Idle),

  /** EntityId of the frame currently highlighted as a drop target, or null */
  highlightedFrame: field.ref(),
})
