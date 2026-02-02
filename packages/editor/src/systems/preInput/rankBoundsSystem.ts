import { defineQuery, type Context } from "@infinitecanvas/ecs";

import { defineEditorSystem } from "../../EditorSystem";
import { Block } from "../../components";
import { Synced } from "@infinitecanvas/ecs-sync";
import { RankBounds } from "../../singletons";

// Query for blocks - tracks added blocks to sync their ranks
const blocksQuery = defineQuery((q) => q.with(Synced, Block));

/**
 * Pre-input system - synchronizes RankBounds singleton with block ranks.
 *
 * Runs early in the input phase (priority: 100) to ensure RankBounds accurately
 * reflects the current min/max ranks across all blocks. This handles:
 * - Blocks added via sync (multiplayer/persistence)
 * - Blocks with ranks that weren't created through RankBounds.genNext/genPrev
 */
export const rankBoundsSystem = defineEditorSystem({ phase: "input", priority: 100 }, (ctx: Context) => {
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
