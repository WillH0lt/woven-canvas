import { Aabb, type Vec2 } from '@woven-canvas/math'
import { type Context, defineQuery, type EntityId, hasComponent } from '@woven-ecs/core'
import { Aabb as AabbComp } from '../components/Aabb'
import { Block } from '../components/Block'
import { Frame } from '../components/Frame'
import { HitGeometry } from '../components/HitGeometry'
import { canBlockInteract, getBlockDef } from './blockDefs'
import { isLayerInteractive, resolveLayerRank } from './layerRank'
import { compareBlockOrder, type SortableBlock } from './sortBlocks'

// Query for all blocks with Aabb
const blocksWithAabb = defineQuery((q) => q.with(Block, AabbComp))

/**
 * Check if a point is inside all ancestor frames of a block.
 * If the block is inside a frame, the visible area is clipped by the frame bounds,
 * so an intersection only counts if the point is also within the frame.
 */
function isPointInsideAncestorFrames(ctx: Context, entityId: EntityId, point: Vec2): boolean {
  let current = Block.read(ctx, entityId).parentId

  while (current !== null && hasComponent(ctx, current, Block)) {
    if (hasComponent(ctx, current, Frame)) {
      if (!AabbComp.containsPoint(ctx, current, point)) {
        return false
      }
    }

    current = Block.read(ctx, current).parentId
  }

  return true
}

/**
 * Check if an AABB intersects all ancestor frames of a block.
 * If the block is inside a frame, the visible area is clipped by the frame bounds,
 * so an intersection only counts if the AABB also intersects the frame.
 */
function isAabbInsideAncestorFrames(ctx: Context, entityId: EntityId, bounds: Aabb): boolean {
  let current = Block.read(ctx, entityId).parentId

  while (current !== null && hasComponent(ctx, current, Block)) {
    if (hasComponent(ctx, current, Frame)) {
      const { value: frameAabb } = AabbComp.read(ctx, current)
      if (!Aabb.intersects(bounds, frameAabb)) {
        return false
      }
    }

    current = Block.read(ctx, current).parentId
  }

  return true
}

/**
 * Find all blocks that contain a point, sorted by z-order (topmost first).
 *
 * Uses AABB for fast rejection, then precise rotated block intersection.
 * For blocks inside frames, also checks that the point falls within
 * all ancestor frame bounds (since frames clip their children).
 *
 * @param ctx - ECS context
 * @param point - Point to test in world coordinates [x, y]
 * @param entityIds - Optional specific entities to test (defaults to all blocks)
 * @returns Array of entity IDs sorted by rank (topmost first)
 */
export function intersectPoint(ctx: Context, point: Vec2, entityIds?: Iterable<EntityId>): EntityId[] {
  const intersects: EntityId[] = []
  const entities = entityIds ?? blocksWithAabb.current(ctx)

  for (const entityId of entities) {
    // Skip non-interactable blocks — they exist in space (for ancestor frame
    // clipping and drop targeting) but are never hit targets.
    const block = Block.read(ctx, entityId)
    if (!canBlockInteract(ctx, block.tag)) continue

    // Skip blocks on a hidden or locked layer — they render-only (or not at all)
    // and are never hit targets.
    if (!isLayerInteractive(ctx, block.layerId)) continue

    // Fast AABB rejection
    if (!AabbComp.containsPoint(ctx, entityId, point)) {
      continue
    }

    // Check HitGeometry if present, otherwise use block intersection
    if (hasComponent(ctx, entityId, HitGeometry)) {
      if (!HitGeometry.containsPointWorld(ctx, entityId, point)) {
        continue
      }
    } else {
      // Precise rotated block intersection
      if (!Block.containsPoint(ctx, entityId, point)) {
        continue
      }
    }

    // If block is inside a frame, verify the point is within frame bounds
    if (!isPointInsideAncestorFrames(ctx, entityId, point)) {
      continue
    }

    intersects.push(entityId)
  }

  // Sort by rank (highest/topmost first)
  return sortByRankDescending(ctx, intersects)
}

/**
 * Find all blocks that intersect with an AABB (selection box).
 *
 * Uses AABB-AABB for fast rejection, then uses Separating Axis Theorem (SAT)
 * for precise AABB-to-oriented-block intersection. This correctly handles
 * all cases including narrow AABBs that pass through the middle of a block
 * without touching any corners.
 *
 * @param ctx - ECS context
 * @param bounds - Selection box bounds [left, top, right, bottom]
 * @param entityIds - Optional specific entities to test (defaults to all blocks)
 * @returns Array of entity IDs that intersect (unsorted)
 */
export function intersectAabb(ctx: Context, bounds: Aabb, entityIds?: Iterable<EntityId>): EntityId[] {
  const intersecting: EntityId[] = []
  const entities = entityIds ?? blocksWithAabb.current(ctx)

  for (const entityId of entities) {
    // Skip non-interactable blocks — they exist in space (for ancestor frame
    // clipping and drop targeting) but are never hit targets.
    const block = Block.read(ctx, entityId)
    if (!canBlockInteract(ctx, block.tag)) continue

    // Skip blocks on a hidden or locked layer — they render-only (or not at all)
    // and are never hit targets.
    if (!isLayerInteractive(ctx, block.layerId)) continue

    const { value: entityAabb } = AabbComp.read(ctx, entityId)

    // Fast AABB-AABB rejection
    if (!Aabb.intersects(bounds, entityAabb)) {
      continue
    }

    // If selection box doesn't fully contain block AABB, do precise check
    if (!Aabb.contains(bounds, entityAabb)) {
      // Check HitGeometry if present, otherwise use block intersection
      if (hasComponent(ctx, entityId, HitGeometry)) {
        if (!HitGeometry.intersectsAabbWorld(ctx, entityId, bounds)) {
          continue
        }
      } else {
        // Use SAT for precise AABB-to-oriented-block intersection
        if (!Block.intersectsAabb(ctx, entityId, bounds)) {
          continue
        }
      }
    }

    // If block is inside a frame, verify the AABB intersects frame bounds
    if (!isAabbInsideAncestorFrames(ctx, entityId, bounds)) {
      continue
    }

    intersecting.push(entityId)
  }

  return intersecting
}

/**
 * Sort entity IDs by stratum, then layer rank, then hierarchical rank in
 * descending order (topmost first). Uses the shared compareBlockOrder for
 * consistency with Vue rendering order.
 */
function sortByRankDescending(ctx: Context, entityIds: EntityId[]): EntityId[] {
  // Build lookup for parentId → SortableBlock resolution
  const getBlock = (id: unknown): SortableBlock | null => {
    if (!hasComponent(ctx, id as EntityId, Block)) return null
    const block = Block.read(ctx, id as EntityId)
    return {
      rank: block.rank,
      stratum: getBlockDef(ctx, block.tag).stratum,
      parentId: block.parentId,
      layerRank: resolveLayerRank(ctx, id as EntityId),
    }
  }

  // Pre-compute SortableBlock for each entity
  const entries = entityIds.map((id) => ({
    id,
    sortable: getBlock(id)!,
  }))

  // Sort descending (topmost first) — negate compareBlockOrder which sorts ascending
  entries.sort((a, b) => -compareBlockOrder(getBlock, a.sortable, b.sortable))

  return entries.map((e) => e.id)
}

/**
 * Get the topmost block at a point.
 *
 * @param ctx - ECS context
 * @param point - Point to test in world coordinates [x, y]
 * @returns Entity ID of topmost block, or undefined if none
 */
export function getTopmostBlockAtPoint(ctx: Context, point: Vec2): EntityId | undefined {
  const intersects = intersectPoint(ctx, point)
  return intersects[0]
}
