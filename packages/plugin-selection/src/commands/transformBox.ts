import { defineCommand, type EntityId } from '@woven-canvas/core'

/**
 * Add transform box components to an entity and update bounds.
 * Called when creating a new transform box (entity already created via createEntity).
 * @param transformBoxId - The entity ID of the transform box (from TransformBoxStateSingleton)
 */
export const AddTransformBox = defineCommand<{
  transformBoxId: EntityId
  skipHandles?: boolean
}>('add-transform-box')

/**
 * Update the transform box bounds to match current selection.
 * Called when the transform box already exists and selection changed.
 * @param transformBoxId - The entity ID of the transform box
 */
export const UpdateTransformBox = defineCommand<{
  transformBoxId: EntityId
}>('update-transform-box')

/**
 * Hide the transform box (keep entity, just make invisible).
 * @param transformBoxId - The entity ID of the transform box
 */
export const HideTransformBox = defineCommand<{
  transformBoxId: EntityId
}>('hide-transform-box')

/**
 * Show the transform box (make visible again).
 * @param transformBoxId - The entity ID of the transform box
 */
export const ShowTransformBox = defineCommand<{
  transformBoxId: EntityId
}>('show-transform-box')

/**
 * Remove the transform box entity entirely.
 * @param transformBoxId - The entity ID of the transform box to remove
 */
export const RemoveTransformBox = defineCommand<{
  transformBoxId: EntityId
}>('remove-transform-box')

/**
 * Enter edit mode for the transform box (e.g., editing text in a block).
 * @param transformBoxId - The entity ID of the transform box
 */
export const StartTransformBoxEdit = defineCommand<{
  transformBoxId: EntityId
}>('start-transform-box-edit')

/**
 * Exit edit mode for the transform box.
 */
export const EndTransformBoxEdit = defineCommand<void>('end-transform-box-edit')
