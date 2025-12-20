import { defineCommand, type EntityId, type Vec2 } from "@infinitecanvas/editor";

/**
 * Drag/move a block to a new position.
 * @param entityId - The block entity to move
 * @param position - New position [left, top]
 */
export const DragBlock = defineCommand<{
  entityId: EntityId;
  position: Vec2;
}>("drag-block");

/**
 * Remove a specific block entity.
 * @param entityId - The block entity to remove
 */
export const RemoveBlock = defineCommand<{
  entityId: EntityId;
}>("remove-block");

/**
 * Remove all currently selected blocks.
 */
export const RemoveSelected = defineCommand<void>("remove-selected");

/**
 * Duplicate all currently selected blocks.
 * Creates copies offset from the originals.
 */
export const DuplicateSelected = defineCommand<void>("duplicate-selected");

/**
 * Bring selected blocks forward in z-order.
 */
export const BringForwardSelected = defineCommand<void>("bring-forward-selected");

/**
 * Send selected blocks backward in z-order.
 */
export const SendBackwardSelected = defineCommand<void>("send-backward-selected");

/**
 * Bring selected blocks to front (topmost z-order).
 */
export const BringToFrontSelected = defineCommand<void>("bring-to-front-selected");

/**
 * Send selected blocks to back (bottommost z-order).
 */
export const SendToBackSelected = defineCommand<void>("send-to-back-selected");

/**
 * Clone entities with an offset.
 * @param entityIds - Array of entity IDs to clone
 * @param offset - Position offset for clones [dx, dy]
 * @param seed - Random seed for consistent cloning
 */
export const CloneEntities = defineCommand<{
  entityIds: EntityId[];
  offset: Vec2;
  seed: string;
}>("clone-entities");

/**
 * Remove cloned entities by seed.
 * @param entityIds - Array of cloned entity IDs
 * @param seed - The seed used when cloning
 */
export const UncloneEntities = defineCommand<{
  entityIds: EntityId[];
  seed: string;
}>("unclone-entities");

/**
 * Set the cursor appearance.
 * @param svg - Optional SVG cursor image
 * @param contextSvg - Optional context-aware SVG cursor
 */
export const SetCursor = defineCommand<{
  svg?: string;
  contextSvg?: string;
}>("set-cursor");
