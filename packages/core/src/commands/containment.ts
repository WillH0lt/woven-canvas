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

/**
 * Fired when a freshly-created block should be placed into the document. A creator
 * (built-in tool or third-party plugin) emits it once after building the block —
 * most go through the {@link createBlock} helper — and it fans out to every
 * interested handler so the creator doesn't have to know the placement details:
 *   - core drops the block onto the frame under its own position (sets `parentId`,
 *     keeping its world position) — unless the caller already parented it deliberately;
 *   - any other plugin can react to attach its own per-block state (e.g. a paged-
 *     document plugin assigning the block to a page's active layer).
 *
 * Only `entityId` is needed — the block already carries its world position, which is
 * the point used to find the frame underneath it.
 *
 * Named an `*Event` (not `PlaceBlock`) because it's a broadcast that handlers
 * *observe*, not an imperative you issue to place one specific block — for that, call
 * {@link createBlock}. It's still modelled on `defineCommand` (woven's per-frame
 * message) rather than a reactive query trigger on purpose: handlers write recorded
 * fields like `Block.parentId`/`Block.layerId`, and these messages are never replayed
 * by undo/redo, so those writes stay undo-safe — they merge into the creation's single
 * history entry the same tick.
 */
export const PlaceBlockEvent = defineCommand<{
  entityId: EntityId
}>('place-block')
