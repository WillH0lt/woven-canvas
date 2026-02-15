import {
  type Context,
  type EntityId,
  defineQuery,
  hasComponent,
} from "@woven-ecs/core";
import {
  Aabb,
  type Vec2,
} from "@infinitecanvas/math";

import { Block } from "../components/Block";
import { Aabb as AabbComp } from "../components/Aabb";
import { HitGeometry } from "../components/HitGeometry";
import { getBlockDef } from "./blockDefs";
import { STRATUM_ORDER } from "../constants";

// Query for all blocks with Aabb
const blocksWithAabb = defineQuery((q) => q.with(Block, AabbComp));

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
    if (!AabbComp.containsPoint(ctx, entityId, point)) {
      continue;
    }

    // Check HitGeometry if present, otherwise use block intersection
    if (hasComponent(ctx, entityId, HitGeometry)) {
      if (!HitGeometry.containsPointWorld(ctx, entityId, point)) {
        continue;
      }
    } else {
      // Precise rotated block intersection
      if (!Block.containsPoint(ctx, entityId, point)) {
        continue;
      }
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
  bounds: Aabb,
  entityIds?: Iterable<EntityId>
): EntityId[] {
  const intersecting: EntityId[] = [];
  const entities = entityIds ?? blocksWithAabb.current(ctx);

  for (const entityId of entities) {
    const { value: entityAabb } = AabbComp.read(ctx, entityId);

    // Fast AABB-AABB rejection
    if (!Aabb.intersects(bounds, entityAabb)) {
      continue;
    }

    // If selection box fully contains block AABB, it's definitely intersecting
    if (Aabb.contains(bounds, entityAabb)) {
      intersecting.push(entityId);
      continue;
    }

    // Check HitGeometry if present, otherwise use block intersection
    if (hasComponent(ctx, entityId, HitGeometry)) {
      if (HitGeometry.intersectsAabbWorld(ctx, entityId, bounds)) {
        intersecting.push(entityId);
      }
    } else {
      // Use SAT for precise AABB-to-oriented-block intersection
      if (Block.intersectsAabb(ctx, entityId, bounds)) {
        intersecting.push(entityId);
      }
    }
  }

  return intersecting;
}

/**
 * Sort entity IDs by stratum then rank in descending order (topmost first).
 * Overlay blocks are always on top of content, which are on top of background.
 * Within each stratum, blocks are sorted by rank (higher = on top).
 */
function sortByRankDescending(ctx: Context, entityIds: EntityId[]): EntityId[] {
  return entityIds.sort((a, b) => {
    const blockA = Block.read(ctx, a);
    const blockB = Block.read(ctx, b);

    // Get stratum for each block
    const stratumA = getBlockDef(ctx, blockA.tag).stratum;
    const stratumB = getBlockDef(ctx, blockB.tag).stratum;

    // Sort by stratum first (overlay > content > background)
    const stratumOrderA = STRATUM_ORDER[stratumA];
    const stratumOrderB = STRATUM_ORDER[stratumB];
    if (stratumOrderB !== stratumOrderA) {
      return stratumOrderB - stratumOrderA;
    }

    // Within same stratum, sort by rank
    const rankA = blockA.rank;
    const rankB = blockB.rank;

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
