import { type Context, type EntityId, defineQuery } from "@infinitecanvas/ecs";
import { Aabb as AabbNs, type Aabb as AabbTuple, type Vec2 } from "@infinitecanvas/math";

import { Block, Aabb } from "../components";

// Query for all blocks with Aabb
const blocksWithAabb = defineQuery((q) => q.with(Block, Aabb));

/**
 * Find all blocks that contain a point, sorted by z-order (topmost first).
 *
 * Uses AABB for fast rejection, then precise rotated block intersection.
 *
 * @param ctx - ECS context
 * @param point - Point to test in world coordinates [x, y]
 * @param entityIds - Optional specific entities to test (defaults to all blocks)
 * @returns Array of entity IDs sorted by rank (topmost first)
 */
export function intersectPoint(
  ctx: Context,
  point: Vec2,
  entityIds?: Iterable<EntityId>
): EntityId[] {
  const intersects: EntityId[] = [];
  const entities = entityIds ?? blocksWithAabb.current(ctx);

  for (const entityId of entities) {
    // Fast AABB rejection
    if (!Aabb.containsPoint(ctx, entityId, point)) {
      continue;
    }

    // Precise rotated block intersection
    if (!Block.containsPoint(ctx, entityId, point)) {
      continue;
    }

    intersects.push(entityId);
  }

  // Sort by rank (highest/topmost first)
  return sortByRankDescending(ctx, intersects);
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
export function intersectAabb(
  ctx: Context,
  bounds: AabbTuple,
  entityIds?: Iterable<EntityId>
): EntityId[] {
  const intersecting: EntityId[] = [];
  const entities = entityIds ?? blocksWithAabb.current(ctx);

  for (const entityId of entities) {
    const { value: entityAabb } = Aabb.read(ctx, entityId);

    // Fast AABB-AABB rejection
    if (!AabbNs.intersects(bounds, entityAabb)) {
      continue;
    }

    // If selection box fully contains block AABB, it's definitely intersecting
    if (AabbNs.contains(bounds, entityAabb)) {
      intersecting.push(entityId);
      continue;
    }

    // Use SAT for precise AABB-to-oriented-block intersection
    if (Block.intersectsAabb(ctx, entityId, bounds)) {
      intersecting.push(entityId);
    }
  }

  return intersecting;
}

/**
 * Sort entity IDs by rank in descending order (topmost first).
 * Fractional indexing keys are designed to be compared with simple string comparison.
 */
function sortByRankDescending(ctx: Context, entityIds: EntityId[]): EntityId[] {
  return entityIds.sort((a, b) => {
    const rankA = Block.read(ctx, a).rank;
    const rankB = Block.read(ctx, b).rank;

    // Handle empty ranks (put at bottom)
    if (!rankA && !rankB) return 0;
    if (!rankA) return 1;
    if (!rankB) return -1;

    // Descending order: higher rank first
    if (rankB > rankA) return 1;
    if (rankB < rankA) return -1;
    return 0;
  });
}

/**
 * Get the topmost block at a point.
 *
 * @param ctx - ECS context
 * @param point - Point to test in world coordinates [x, y]
 * @returns Entity ID of topmost block, or undefined if none
 */
export function getTopmostBlockAtPoint(
  ctx: Context,
  point: Vec2
): EntityId | undefined {
  const intersects = intersectPoint(ctx, point);
  return intersects[0];
}
