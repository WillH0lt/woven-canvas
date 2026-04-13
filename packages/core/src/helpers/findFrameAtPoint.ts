import { type Context, defineQuery, type EntityId, hasComponent } from '@woven-ecs/core'
import { Aabb } from '../components/Aabb'
import { Block } from '../components/Block'
import { Frame } from '../components/Frame'
import { Selected } from '../components/Selected'
import { isAncestor } from './hierarchy'
import { compareBlockOrder, type SortableBlock } from './sortBlocks'

const frameQuery = defineQuery((q) => q.with(Block, Frame))

function getBlockDef(ctx: Context): (id: unknown) => SortableBlock | null {
  return (id) => {
    if (!hasComponent(ctx, id as EntityId, Block)) return null
    const block = Block.read(ctx, id as EntityId)
    return { rank: block.rank, stratum: 'content', parentId: block.parentId }
  }
}

/**
 * Find the topmost frame whose AABB contains the given point.
 * Excludes a specific entity (e.g. the one being dragged), any selected frames,
 * and any frame that would create a cycle (i.e. the candidate is a descendant of exclude).
 *
 * Uses hierarchical sort order (compareBlockOrder) so that overlapping frames
 * nested inside low-ranked parents are correctly compared.
 */
export function findFrameAtPoint(
  ctx: Context,
  point: [number, number],
  exclude: EntityId | null = null,
): EntityId | null {
  let best: EntityId | null = null
  let bestSortable: SortableBlock | null = null
  const getBlock = getBlockDef(ctx)

  for (const frameId of frameQuery.current(ctx)) {
    if (frameId === exclude) continue
    if (hasComponent(ctx, frameId, Selected)) continue
    if (!Aabb.containsPoint(ctx, frameId, point)) continue

    // Prevent cycles: skip if this frame is a descendant of the block being placed
    if (exclude !== null && isAncestor(ctx, frameId, exclude)) continue

    const block = Block.read(ctx, frameId)
    const sortable: SortableBlock = { rank: block.rank, stratum: 'content', parentId: block.parentId }

    if (best === null || compareBlockOrder(getBlock, sortable, bestSortable!) > 0) {
      best = frameId
      bestSortable = sortable
    }
  }

  return best
}
