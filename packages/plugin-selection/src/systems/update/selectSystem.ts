import {
  defineEditorSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  on,
  Synced,
  type Context,
  Block,
  Aabb,
  Selected,
  Opacity,
  selectBlock,
  getLocalSelectedBlocks,
  intersectAabb,
} from "@infinitecanvas/editor";

import { SelectionBox } from "../../components";
import {
  AddSelectionBox,
  UpdateSelectionBox,
  RemoveSelectionBox,
} from "../../commands";

// Query for selection box entities
const selectionBoxQuery = defineQuery((q) => q.with(Block, SelectionBox));

// Query for all synced blocks (for intersection)
const syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced, Aabb));

// Selection box z-order rank (always on top)
const SELECTION_BOX_RANK = "z";

/**
 * Selection update system - handles selection box commands.
 *
 * Processes:
 * - AddSelectionBox: Creates the marquee selection box entity
 * - UpdateSelectionBox: Updates bounds and selects intersecting blocks
 * - RemoveSelectionBox: Removes the selection box entity
 */
export const selectSystem = defineEditorSystem({ phase: "update" }, (ctx: Context) => {
  on(ctx, AddSelectionBox, (ctx) => {
    const entityId = createEntity(ctx);
    addComponent(ctx, entityId, Block, {
      tag: "selection-box",
      position: [0, 0],
      size: [0, 0],
      rotateZ: 0,
      rank: SELECTION_BOX_RANK,
    });
    addComponent(ctx, entityId, SelectionBox, {});
  });

  on(ctx, UpdateSelectionBox, (ctx, { bounds, deselectOthers }) => {
    const selectionBoxes = selectionBoxQuery.current(ctx);
    if (selectionBoxes.length === 0) {
      console.warn("Can't update selection box: not found");
      return;
    }

    const selectionBoxId = selectionBoxes[0];

    // Update block position/size from bounds
    const block = Block.write(ctx, selectionBoxId);
    const left = bounds[0];
    const top = bounds[1];
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];

    block.position = [left, top];
    block.size = [width, height];

    // Find all blocks intersecting the selection box
    const intersectedEntityIds = intersectAabb(
      ctx,
      bounds,
      syncedBlocksQuery.current(ctx)
    );

    // Deselect blocks outside the selection box if requested
    if (deselectOthers) {
      for (const selectedId of getLocalSelectedBlocks(ctx)) {
        const shouldDeselect = !intersectedEntityIds.includes(selectedId);
        if (shouldDeselect && hasComponent(ctx, selectedId, Selected)) {
          removeComponent(ctx, selectedId, Selected);
        }
      }
    }

    // Select all intersected blocks
    for (const entityId of intersectedEntityIds) {
      selectBlock(ctx, entityId);
    }
  });

  on(ctx, RemoveSelectionBox, (ctx) => {
    const selectionBoxes = selectionBoxQuery.current(ctx);
    if (selectionBoxes.length === 0) {
      console.warn("Can't remove selection box: not found");
      return;
    }

    const selectionBoxId = selectionBoxes[0];
    removeEntity(ctx, selectionBoxId);
  });
});
