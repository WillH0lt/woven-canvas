import { type Context, type EntityId, hasComponent } from "@infinitecanvas/ecs";
import {
  Capsule,
  type Capsule as CapsuleTuple,
  Aabb as AabbNs,
} from "@infinitecanvas/math";

import { Block } from "../components/Block";
import { Aabb } from "../components/Aabb";
import { HitGeometry, FLOATS_PER_CAPSULE } from "../components/HitGeometry";

/**
 * Find all blocks that intersect with a capsule.
 *
 * Uses a two-phase approach:
 * 1. Broad phase: AABB intersection for fast rejection
 * 2. Narrow phase: Precise capsule intersection with HitGeometry (if available)
 *    or AABB fallback
 *
 * @param ctx - ECS context
 * @param capsule - Capsule to test [ax, ay, bx, by, radius]
 * @param entityIds - Entities to test (required - typically from a query)
 * @returns Array of entity IDs that intersect with the capsule
 *
 * @example
 * ```typescript
 * const syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced, Aabb));
 *
 * // In a system:
 * const capsule = Capsule.create(x1, y1, x2, y2, radius);
 * const hits = intersectCapsule(ctx, capsule, syncedBlocksQuery.current(ctx));
 * ```
 */
export function intersectCapsule(
  ctx: Context,
  capsule: CapsuleTuple,
  entityIds: Iterable<EntityId>
): EntityId[] {
  const intersects: EntityId[] = [];

  // Get capsule bounds for broad phase
  const capsuleBounds = Capsule.bounds(capsule);

  for (const entityId of entityIds) {
    // Broad phase: AABB intersection test
    const aabb = Aabb.read(ctx, entityId);
    if (!AabbNs.intersects(capsuleBounds, aabb.value)) {
      continue;
    }

    // Narrow phase: Check against HitGeometry if available
    if (hasComponent(ctx, entityId, HitGeometry)) {
      if (intersectsCapsuleHitGeometry(ctx, entityId, capsule)) {
        intersects.push(entityId);
      }
    } else {
      // Fall back to AABB intersection for entities without HitGeometry
      if (Capsule.intersectsAabb(capsule, aabb.value)) {
        intersects.push(entityId);
      }
    }
  }

  return intersects;
}

/**
 * Check if a capsule intersects with an entity's hit geometry.
 *
 * @param ctx - ECS context
 * @param entityId - Entity with HitGeometry component
 * @param capsule - Capsule to test
 * @returns True if the capsule intersects any of the entity's hit capsules
 */
function intersectsCapsuleHitGeometry(
  ctx: Context,
  entityId: EntityId,
  capsule: CapsuleTuple
): boolean {
  const hitGeometry = HitGeometry.read(ctx, entityId);

  for (let i = 0; i < hitGeometry.capsuleCount; i++) {
    const offset = i * FLOATS_PER_CAPSULE;
    const hitCapsule = Capsule.create(
      hitGeometry.hitCapsules[offset],
      hitGeometry.hitCapsules[offset + 1],
      hitGeometry.hitCapsules[offset + 2],
      hitGeometry.hitCapsules[offset + 3],
      hitGeometry.hitCapsules[offset + 4]
    );

    if (Capsule.intersectsCapsule(capsule, hitCapsule)) {
      return true;
    }
  }

  return false;
}
