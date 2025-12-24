import {
  defineSystem,
  defineQuery,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  on,
  Persistent,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";

import { Block, Aabb, Selected } from "../components";
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
  SetCursor,
} from "../commands";
import { RankBounds, Cursor } from "../singletons";

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected));

// Query for persistent blocks
const persistentBlocksQuery = defineQuery((q) => q.with(Block, Persistent));

/**
 * Block update system - handles block manipulation commands.
 *
 * Processes:
 * - SelectBlock, DeselectBlock, ToggleSelect, DeselectAll, SelectAll
 * - RemoveBlock, RemoveSelected
 * - DragBlock
 * - BringForwardSelected, SendBackwardSelected
 * - SetCursor
 */
export const UpdateBlock = defineSystem((ctx: Context) => {
  on(ctx, DragBlock, (ctx, { entityId, position }) => {
    if (!hasComponent(ctx, entityId, Block)) return;
    const block = Block.write(ctx, entityId);
    block.position = position;
  });

  on(ctx, SelectBlock, (ctx, { entityId, deselectOthers }) => {
    if (deselectOthers) {
      deselectAllBlocks(ctx);
    }
    if (!hasComponent(ctx, entityId, Selected)) {
      addComponent(ctx, entityId, Selected, { selectedBy: "" });
    }
  });

  on(ctx, DeselectBlock, (ctx, { entityId }) => {
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    }
  });

  on(ctx, ToggleSelect, (ctx, { entityId }) => {
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    } else {
      addComponent(ctx, entityId, Selected, { selectedBy: "" });
    }
  });

  on(ctx, DeselectAll, deselectAllBlocks);

  on(ctx, SelectAll, (ctx) => {
    for (const entityId of persistentBlocksQuery.current(ctx)) {
      if (!hasComponent(ctx, entityId, Selected)) {
        addComponent(ctx, entityId, Selected, { selectedBy: "" });
      }
    }
  });

  on(ctx, RemoveBlock, (ctx, { entityId }) => {
    removeEntity(ctx, entityId);
  });

  on(ctx, RemoveSelected, (ctx) => {
    for (const entityId of selectedBlocksQuery.current(ctx)) {
      removeEntity(ctx, entityId);
    }
  });

  on(ctx, BringForwardSelected, bringForwardSelected);
  on(ctx, SendBackwardSelected, sendBackwardSelected);

  on(ctx, SetCursor, (ctx, payload) => {
    const cursor = Cursor.write(ctx);
    if (payload.svg !== undefined) {
      cursor.svg = payload.svg;
    }
    if (payload.contextSvg !== undefined) {
      cursor.contextSvg = payload.contextSvg;
    }
  });
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
function bringForwardSelected(ctx: Context): void {
  console.log("Bringing selected blocks forward");

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
function sendBackwardSelected(ctx: Context): void {
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
