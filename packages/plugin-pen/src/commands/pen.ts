import { defineCommand, type EntityId } from '@woven-canvas/core'
import type { Vec2 } from '@woven-canvas/math'

/**
 * Start a new pen stroke at the given world position.
 * Creates a new PenStroke entity.
 */
export const StartPenStroke = defineCommand<{
  worldPosition: Vec2
  pressure: number | null
}>('start-pen-stroke')

/**
 * Add a point to the active pen stroke.
 * Updates the stroke geometry and expands bounds as needed.
 */
export const AddPenStrokePoint = defineCommand<{
  strokeId: EntityId
  worldPosition: Vec2
  pressure: number | null
}>('add-pen-stroke-point')

/**
 * Complete the pen stroke (pointer released).
 * Marks the stroke as complete and triggers hit geometry generation.
 */
export const CompletePenStroke = defineCommand<{
  strokeId: EntityId
}>('complete-pen-stroke')

/**
 * Remove/cancel the pen stroke without saving.
 * Deletes the stroke entity entirely.
 */
export const RemovePenStroke = defineCommand<{
  strokeId: EntityId
}>('remove-pen-stroke')
