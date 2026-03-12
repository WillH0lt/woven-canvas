import { defineCommand, type EntityId } from '@woven-canvas/core'
import type { Vec2 } from '@woven-canvas/math'

/**
 * Add a new tape block at the given world position.
 */
export const AddTape = defineCommand<{
  entityId: EntityId
  position: Vec2
}>('tape-add')

/**
 * Update tape geometry during drawing.
 * Stretches tape from start to end position.
 */
export const DrawTape = defineCommand<{
  entityId: EntityId
  start: Vec2
  end: Vec2
}>('tape-draw')

/**
 * Remove a tape entity (on cancel).
 */
export const RemoveTape = defineCommand<{
  entityId: EntityId
}>('tape-remove')

/**
 * Complete drawing a tape.
 * Finalizes the tape and selects it.
 */
export const CompleteTape = defineCommand<{
  entityId: EntityId
}>('tape-complete')

/**
 * Place a default-sized tape at the given position (on simple click).
 */
export const PlaceTape = defineCommand<{
  entityId: EntityId
  position: Vec2
}>('tape-place')
