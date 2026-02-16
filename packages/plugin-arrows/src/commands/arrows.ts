import { defineCommand, type EntityId } from '@infinitecanvas/core'
import type { Vec2 } from '@infinitecanvas/math'
import type { ArrowKind } from '../types'

/**
 * Add a new arrow at the given world position.
 * Creates a new arrow entity with the specified kind (arc or elbow).
 */
export const AddArrow = defineCommand<{
  entityId: EntityId
  position: Vec2
  kind: ArrowKind
}>('arrows-add-arrow')

/**
 * Draw/update an arrow from start to end position.
 * Updates the arrow geometry as the user drags.
 */
export const DrawArrow = defineCommand<{
  entityId: EntityId
  start: Vec2
  end: Vec2
}>('arrows-draw-arrow')

/**
 * Remove an arrow entity.
 */
export const RemoveArrow = defineCommand<{
  entityId: EntityId
}>('arrows-remove-arrow')

/**
 * Complete drawing an arrow.
 * Finalizes the arrow and creates a checkpoint.
 */
export const CompleteArrow = defineCommand<{
  entityId: EntityId
}>('arrows-complete-arrow')

/**
 * Add or update transform handles for the selected arrow.
 * Creates handle entities if they don't exist, or updates existing ones.
 */
export const AddOrUpdateTransformHandles = defineCommand<{
  arrowEntityId: EntityId
}>('arrows-add-or-update-transform-handles')

/**
 * Remove all transform handles.
 */
export const RemoveTransformHandles = defineCommand<{}>('arrows-remove-transform-handles')

/**
 * Hide transform handles temporarily.
 * Used during drag operations.
 */
export const HideTransformHandles = defineCommand<{}>('arrows-hide-transform-handles')

/**
 * Show transform handles after hiding.
 */
export const ShowTransformHandles = defineCommand<{}>('arrows-show-transform-handles')
