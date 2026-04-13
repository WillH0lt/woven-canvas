import type { EntityId } from '@woven-ecs/core'
import { defineCommand } from '../command'

/**
 * Add a drop target highlight to a frame.
 */
export const AddFrameHighlight = defineCommand<{
  frameId: EntityId
}>('frame-add-highlight')

/**
 * Remove the drop target highlight from a frame.
 */
export const RemoveFrameHighlight = defineCommand<{
  frameId: EntityId
}>('frame-remove-highlight')

/**
 * Assign blocks to frames after a drop.
 * Each entry maps a block to its target frame (or null to remove from frame).
 */
export const AssignFrameChildren = defineCommand<{
  assignments: Array<{ entityId: EntityId; frameId: EntityId | null }>
}>('frame-assign-children')
