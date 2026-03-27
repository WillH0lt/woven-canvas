import type { Vec2 } from '@woven-canvas/math'
import type { EntityId } from '@woven-ecs/core'
import { defineCommand } from '../command'

/**
 * Add a new shape block at the given world position.
 */
export const AddShapeBlock = defineCommand<{
  entityId: EntityId
  position: Vec2
}>('shape-draw-add')

/**
 * Update shape geometry during drawing.
 * Stretches shape from anchor corner to current cursor position.
 */
export const DrawShapeBlock = defineCommand<{
  entityId: EntityId
  start: Vec2
  end: Vec2
}>('shape-draw-update')

/**
 * Remove a shape entity (on cancel).
 */
export const RemoveShapeBlock = defineCommand<{
  entityId: EntityId
}>('shape-draw-remove')

/**
 * Complete drawing a shape.
 * Finalizes the shape and selects it.
 */
export const CompleteShapeBlock = defineCommand<{
  entityId: EntityId
}>('shape-draw-complete')

/**
 * Place a default-sized shape at the given position (on simple click).
 */
export const PlaceShapeBlock = defineCommand<{
  entityId: EntityId
  position: Vec2
}>('shape-draw-place')
