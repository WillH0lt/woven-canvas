import {
  defineSystem,
  defineQuery,
  type Context,
  Persistent,
} from "@infinitecanvas/editor";

import { Block } from "../components";
import { RankBounds } from "../singletons";

// Query for blocks - tracks added blocks to sync their ranks
const blocksQuery = defineQuery((q) => q.with(Persistent, Block));

/**
 * Pre-input system - synchronizes RankBounds singleton with block ranks.
 *
 * Runs before input processing to ensure RankBounds accurately reflects
 * the current min/max ranks across all blocks. This handles:
 * - Blocks added via sync (multiplayer/persistence)
 * - Blocks with ranks that weren't created through RankBounds.genNext/genPrev
 */
export const PreInputRankBounds = defineSystem((ctx: Context) => {
  const added = blocksQuery.added(ctx);

  // Process newly added blocks
  for (const entityId of added) {
    const block = Block.read(ctx, entityId);
    if (block.rank === "") {
      const writableBlock = Block.write(ctx, entityId);
      writableBlock.rank = RankBounds.genNext(ctx);
    } else {
      RankBounds.add(ctx, block.rank);
    }
  }
});
