import { Aabb as AabbNs, Arc, Capsule, Mat2, Polygon, type Vec2 } from '@woven-canvas/math'
import { type Context, type EntityId, hasComponent } from '@woven-ecs/core'

import { Aabb as AabbComponent } from '../components/Aabb'
import { Block } from '../components/Block'
import { Frame } from '../components/Frame'
import { HitGeometry, MAX_HIT_POLYGON_POINTS } from '../components/HitGeometry'

// Pre-allocated matrix for UV-to-world transforms (avoids allocation in hot paths)
const _uvToWorldMatrix: Mat2 = [1, 0, 0, 1, 0, 0]

// Pre-allocated scratch for transforming the UV polygon to world space.
const _worldPolygon = new Float32Array(MAX_HIT_POLYGON_POINTS * 2)
const _polyPt: Vec2 = [0, 0]

/**
 * Check if a capsule intersects all ancestor frames of a block.
 * If the block is inside a frame, the visible area is clipped by the frame bounds,
 * so an intersection only counts if the capsule also intersects the frame.
 */
function isCapsuleInsideAncestorFrames(ctx: Context, entityId: EntityId, capsule: Capsule): boolean {
  let current = Block.read(ctx, entityId).parentId

  while (current !== null && hasComponent(ctx, current, Block)) {
    if (hasComponent(ctx, current, Frame)) {
      const { value: frameAabb } = AabbComponent.read(ctx, current)
      if (!Capsule.intersectsAabb(capsule, frameAabb)) {
        return false
      }
    }

    current = Block.read(ctx, current).parentId
  }

  return true
}

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
export function intersectCapsule(ctx: Context, capsule: Capsule, entityIds: Iterable<EntityId>): EntityId[] {
  const intersects: EntityId[] = []

  // Get capsule bounds for broad phase
  const capsuleBounds = Capsule.bounds(capsule)

  for (const entityId of entityIds) {
    // Broad phase: AABB intersection test
    const aabb = AabbComponent.read(ctx, entityId)
    if (!AabbNs.intersects(capsuleBounds, aabb.value)) {
      continue
    }

    // Narrow phase: Check against HitGeometry if available
    if (hasComponent(ctx, entityId, HitGeometry)) {
      if (!intersectsCapsuleHitGeometry(ctx, entityId, capsule)) {
        continue
      }
    } else {
      // Fall back to AABB intersection for entities without HitGeometry
      if (!Capsule.intersectsAabb(capsule, aabb.value)) {
        continue
      }
    }

    // If block is inside a frame, verify the capsule bounds intersect frame bounds
    if (!isCapsuleInsideAncestorFrames(ctx, entityId, capsule)) {
      continue
    }

    intersects.push(entityId)
  }

  return intersects
}

/**
 * Check if a capsule intersects with an entity's hit geometry.
 * Hit geometry is stored in UV coordinates; this transforms to world for testing.
 *
 * @param ctx - ECS context
 * @param entityId - Entity with HitGeometry component
 * @param capsule - Capsule to test in world coordinates
 * @returns True if the capsule intersects any of the entity's hit capsules or arc
 */
function intersectsCapsuleHitGeometry(ctx: Context, entityId: EntityId, capsule: Capsule): boolean {
  const hitGeometry = HitGeometry.read(ctx, entityId)

  // Build UV-to-world matrix once (computes sin/cos once)
  Block.getUvToWorldMatrix(ctx, entityId, _uvToWorldMatrix)

  // Check arc intersections (transform UV arcs to world)
  for (let i = 0; i < hitGeometry.arcCount; i++) {
    const uvArc = HitGeometry.getArcAt(ctx, entityId, i)

    // Transform 3 UV points to world using matrix
    const worldA: Vec2 = [uvArc[0], uvArc[1]]
    Mat2.transformPoint(_uvToWorldMatrix, worldA)
    const worldB: Vec2 = [uvArc[2], uvArc[3]]
    Mat2.transformPoint(_uvToWorldMatrix, worldB)
    const worldC: Vec2 = [uvArc[4], uvArc[5]]
    Mat2.transformPoint(_uvToWorldMatrix, worldC)

    const thickness = uvArc[6] // Already in world units

    const worldArc = Arc.create(worldA[0], worldA[1], worldB[0], worldB[1], worldC[0], worldC[1], thickness)

    const capsuleA = Capsule.pointA(capsule)
    const capsuleB = Capsule.pointB(capsule)
    if (Arc.intersectsCapsule(worldArc, capsuleA, capsuleB, Capsule.radius(capsule))) {
      return true
    }
  }

  // Check capsule intersections (transform UV capsules to world)
  for (let i = 0; i < hitGeometry.capsuleCount; i++) {
    const uvCapsule = HitGeometry.getCapsuleAt(ctx, entityId, i)

    // Transform 2 UV points to world using matrix
    const worldA: Vec2 = [uvCapsule[0], uvCapsule[1]]
    Mat2.transformPoint(_uvToWorldMatrix, worldA)
    const worldB: Vec2 = [uvCapsule[2], uvCapsule[3]]
    Mat2.transformPoint(_uvToWorldMatrix, worldB)

    const radius = uvCapsule[4] // Already in world units

    const worldCapsule = Capsule.create(worldA[0], worldA[1], worldB[0], worldB[1], radius)

    if (Capsule.intersectsCapsule(capsule, worldCapsule)) {
      return true
    }
  }

  // Check filled polygon (even-odd) — transform UV verts to world scratch.
  const polygonPointCount = hitGeometry.polygonPointCount
  if (polygonPointCount > 0) {
    for (let i = 0; i < polygonPointCount; i++) {
      _polyPt[0] = hitGeometry.hitPolygon[i * 2]
      _polyPt[1] = hitGeometry.hitPolygon[i * 2 + 1]
      Mat2.transformPoint(_uvToWorldMatrix, _polyPt)
      _worldPolygon[i * 2] = _polyPt[0]
      _worldPolygon[i * 2 + 1] = _polyPt[1]
    }

    if (Polygon.intersectsCapsule(_worldPolygon, polygonPointCount, capsule)) {
      return true
    }
  }

  return false
}
