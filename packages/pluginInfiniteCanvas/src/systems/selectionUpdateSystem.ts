import {
  defineSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  type Context,
} from "@infinitecanvas/editor";
import { Aabb as AabbNs } from "@infinitecanvas/math";

import { Block, Aabb, Selected, Persistent, SelectionBox } from "../components";
import {
  AddSelectionBox,
  UpdateSelectionBox,
  RemoveSelectionBox,
} from "../commands";
import { RankBounds } from "../singletons";
import { intersectAabb } from "../helpers";

// Query for selection box entities
const selectionBoxQuery = defineQuery((q) => q.with(Block).with(SelectionBox));

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block).with(Selected));

// Query for all persistent blocks (for intersection)
const persistentBlocksQuery = defineQuery((q) => q.with(Block).with(Persistent).with(Aabb));

// Selection box z-order rank (always on top)
const SELECTION_BOX_RANK = "~"; // '~' is near the end of ASCII, so it's always on top

/**
 * Selection update system - handles selection box commands.
 *
 * Processes:
 * - AddSelectionBox: Creates the marquee selection box entity
 * - UpdateSelectionBox: Updates bounds and selects intersecting blocks
 * - RemoveSelectionBox: Removes the selection box entity
 */
export const selectionUpdateSystem = defineSystem((ctx: Context) => {
  // Handle AddSelectionBox command
  for (const _ of AddSelectionBox.iter(ctx)) {
    // Create selection box entity
    const entityId = createEntity(ctx);
    addComponent(ctx, entityId, Block, {
      tag: "selectionBox",
      position: [0, 0],
      size: [0, 0],
      rotateZ: 0,
      rank: SELECTION_BOX_RANK,
    });
    addComponent(ctx, entityId, SelectionBox, {});
  }

  // Handle UpdateSelectionBox command
  for (const { payload } of UpdateSelectionBox.iter(ctx)) {
    const { bounds, deselectOthers } = payload;

    // Find the selection box entity
    const selectionBoxes = selectionBoxQuery.current(ctx);
    if (selectionBoxes.length === 0) {
      console.warn("Can't update selection box: not found");
      continue;
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
    const intersectedEntityIds = intersectAabb(ctx, bounds, persistentBlocksQuery.current(ctx));

    // Deselect blocks outside the selection box if requested
    if (deselectOthers) {
      for (const selectedId of selectedBlocksQuery.current(ctx)) {
        const shouldDeselect = !intersectedEntityIds.includes(selectedId);
        if (shouldDeselect && hasComponent(ctx, selectedId, Selected)) {
          removeComponent(ctx, selectedId, Selected);
        }
      }
    }

    // Select all intersected blocks
    for (const entityId of intersectedEntityIds) {
      if (!hasComponent(ctx, entityId, Selected)) {
        addComponent(ctx, entityId, Selected, { selectedBy: "" });
      }
    }
  }

  // Handle RemoveSelectionBox command
  for (const _ of RemoveSelectionBox.iter(ctx)) {
    const selectionBoxes = selectionBoxQuery.current(ctx);
    if (selectionBoxes.length === 0) {
      console.warn("Can't remove selection box: not found");
      continue;
    }

    const selectionBoxId = selectionBoxes[0];
    removeEntity(ctx, selectionBoxId);
  }
});
