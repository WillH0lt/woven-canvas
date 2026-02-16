import { field } from '@infinitecanvas/core'
import { defineCanvasSingleton } from '@woven-ecs/canvas-store'

/**
 * BlockPlacementState singleton - tracks state for the block placement system.
 *
 * Stores the checkpoint ID for squashing history when editing ends.
 */
export const BlockPlacementState = defineCanvasSingleton(
  { name: 'blockPlacementState' },
  {
    /** Checkpoint ID for squashing edited block history, or empty string if none */
    editedCheckpoint: field.string().default('').max(36),
  },
)
