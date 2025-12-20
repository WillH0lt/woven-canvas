import {
  defineSystem,
  defineQuery,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";

import { Block, Aabb, Selected, Persistent } from "../components";
import {
  SelectBlock,
  DeselectBlock,
  ToggleSelect,
  DeselectAll,
  SelectAll,
  RemoveBlock,
  RemoveSelected,
  DragBlock,
  BringForwardSelected,
  SendBackwardSelected,
  BringToFrontSelected,
  SendToBackSelected,
  SetCursor,
} from "../commands";
import { RankBounds, Cursor } from "../singletons";

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block).with(Selected));

// Query for persistent blocks
const persistentBlocksQuery = defineQuery((q) => q.with(Block).with(Persistent));

/**
 * Block update system - handles block manipulation commands.
 *
 * Processes:
 * - SelectBlock, DeselectBlock, ToggleSelect, DeselectAll, SelectAll
 * - RemoveBlock, RemoveSelected
 * - DragBlock
 * - BringForwardSelected, SendBackwardSelected, BringToFrontSelected, SendToBackSelected
 * - SetCursor
 */
export const blockUpdateSystem = defineSystem((ctx: Context) => {
  // Handle DragBlock command
  for (const { payload } of DragBlock.iter(ctx)) {
    const { entityId, position } = payload;
    if (!hasComponent(ctx, entityId, Block)) continue;

    const block = Block.write(ctx, entityId);
    block.position = position;
  }

  // Handle SelectBlock command
  for (const { payload } of SelectBlock.iter(ctx)) {
    const { entityId, deselectOthers } = payload;

    if (deselectOthers) {
      deselectAllBlocks(ctx);
    }

    if (!hasComponent(ctx, entityId, Selected)) {
      addComponent(ctx, entityId, Selected, { selectedBy: "" });
    }
  }

  // Handle DeselectBlock command
  for (const { payload } of DeselectBlock.iter(ctx)) {
    const { entityId } = payload;
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    }
  }

  // Handle ToggleSelect command
  for (const { payload } of ToggleSelect.iter(ctx)) {
    const { entityId } = payload;
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    } else {
      addComponent(ctx, entityId, Selected, { selectedBy: "" });
    }
  }

  // Handle DeselectAll command
  for (const _ of DeselectAll.iter(ctx)) {
    deselectAllBlocks(ctx);
  }

  // Handle SelectAll command
  for (const _ of SelectAll.iter(ctx)) {
    for (const entityId of persistentBlocksQuery.current(ctx)) {
      if (!hasComponent(ctx, entityId, Selected)) {
        addComponent(ctx, entityId, Selected, { selectedBy: "" });
      }
    }
  }

  // Handle RemoveBlock command
  for (const { payload } of RemoveBlock.iter(ctx)) {
    const { entityId } = payload;
    removeEntity(ctx, entityId);
  }

  // Handle RemoveSelected command
  for (const _ of RemoveSelected.iter(ctx)) {
    for (const entityId of selectedBlocksQuery.current(ctx)) {
      removeEntity(ctx, entityId);
    }
  }

  // Handle BringForwardSelected / BringToFrontSelected command
  for (const _ of BringForwardSelected.iter(ctx)) {
    bringSelectedForward(ctx);
  }
  for (const _ of BringToFrontSelected.iter(ctx)) {
    bringSelectedForward(ctx);
  }

  // Handle SendBackwardSelected / SendToBackSelected command
  for (const _ of SendBackwardSelected.iter(ctx)) {
    sendSelectedBackward(ctx);
  }
  for (const _ of SendToBackSelected.iter(ctx)) {
    sendSelectedBackward(ctx);
  }

  // Handle SetCursor command
  for (const { payload } of SetCursor.iter(ctx)) {
    const cursor = Cursor.write(ctx);
    if (payload.svg !== undefined) {
      cursor.svg = payload.svg;
    }
    if (payload.contextSvg !== undefined) {
      cursor.contextSvg = payload.contextSvg;
    }
  }
});

/**
 * Deselect all blocks.
 */
function deselectAllBlocks(ctx: Context): void {
  for (const entityId of selectedBlocksQuery.current(ctx)) {
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    }
  }
}

/**
 * Bring selected blocks to front (generate new ranks).
 */
function bringSelectedForward(ctx: Context): void {
  const selectedBlocks = Array.from(selectedBlocksQuery.current(ctx));
  if (selectedBlocks.length === 0) return;

  // Sort by current rank (ascending)
  selectedBlocks.sort((a, b) => {
    const blockA = Block.read(ctx, a);
    const blockB = Block.read(ctx, b);
    if (!blockA.rank && !blockB.rank) return 0;
    if (!blockA.rank) return -1;
    if (!blockB.rank) return 1;
    if (blockA.rank < blockB.rank) return -1;
    if (blockA.rank > blockB.rank) return 1;
    return 0;
  });

  // Assign new ranks at the front
  for (const entityId of selectedBlocks) {
    const block = Block.write(ctx, entityId);
    block.rank = RankBounds.genNext(ctx);
  }
}

/**
 * Send selected blocks to back (generate new ranks).
 */
function sendSelectedBackward(ctx: Context): void {
  const selectedBlocks = Array.from(selectedBlocksQuery.current(ctx));
  if (selectedBlocks.length === 0) return;

  // Sort by current rank (descending - process highest rank first)
  selectedBlocks.sort((a, b) => {
    const blockA = Block.read(ctx, a);
    const blockB = Block.read(ctx, b);
    if (!blockA.rank && !blockB.rank) return 0;
    if (!blockA.rank) return 1;
    if (!blockB.rank) return -1;
    if (blockB.rank < blockA.rank) return -1;
    if (blockB.rank > blockA.rank) return 1;
    return 0;
  });

  // Assign new ranks at the back
  for (const entityId of selectedBlocks) {
    const block = Block.write(ctx, entityId);
    block.rank = RankBounds.genPrev(ctx);
  }
}
