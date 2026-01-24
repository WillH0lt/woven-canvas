import { defineCommand, type EntityId } from "@infinitecanvas/editor";
import type { Aabb } from "@infinitecanvas/math";

/**
 * Select a specific block entity.
 * @param entityId - The block entity to select
 * @param deselectOthers - If true, deselect all other blocks first (default: false)
 */
export const SelectBlock = defineCommand<{
  entityId: EntityId;
  deselectOthers?: boolean;
}>("select-block");

/**
 * Deselect a specific block entity.
 * @param entityId - The block entity to deselect
 */
export const DeselectBlock = defineCommand<{
  entityId: EntityId;
}>("deselect-block");

/**
 * Toggle selection state of a block entity.
 * @param entityId - The block entity to toggle
 */
export const ToggleSelect = defineCommand<{
  entityId: EntityId;
}>("toggle-select");

/**
 * Deselect all currently selected blocks.
 */
export const DeselectAll = defineCommand<void>("deselect-all");

/**
 * Select all blocks in the canvas.
 */
export const SelectAll = defineCommand<void>("select-all");

/**
 * Add a selection box entity for marquee selection.
 */
export const AddSelectionBox = defineCommand<void>("add-selection-box");

/**
 * Update the selection box bounds and select intersecting blocks.
 * @param bounds - The selection box bounds [left, top, right, bottom]
 * @param deselectOthers - If true, deselect blocks outside the selection box
 */
export const UpdateSelectionBox = defineCommand<{
  bounds: Aabb;
  deselectOthers?: boolean;
}>("update-selection-box");

/**
 * Remove the selection box entity.
 */
export const RemoveSelectionBox = defineCommand<void>("remove-selection-box");

/**
 * Add Held component to an entity (marks it as being interacted with).
 * Used when starting a drag on an unselected block.
 * @param entityId - The entity to hold
 */
export const AddHeld = defineCommand<{
  entityId: EntityId;
}>("add-held");

/**
 * Remove Held component from an entity (if not selected).
 * Used when cancelling a drag on an unselected block.
 * @param entityId - The entity to release
 */
export const RemoveHeld = defineCommand<{
  entityId: EntityId;
}>("remove-held");
