import { Aabb } from '@infinitecanvas/math'
import { type Context, type EntityId, hasComponent } from '@woven-ecs/core'
import { Block } from '../components/Block'
import { HitGeometry } from '../components/HitGeometry'

/**
 * Compute AABB from block or hit geometry.
 * If the entity has HitGeometry, computes AABB spanning all hit geometries.
 * Otherwise, computes AABB from block corners.
 *
 * @param ctx - ECS context
 * @param entityId - Entity ID with Block component
 * @param out - Output AABB tuple to write to
 */
export function computeAabb(ctx: Context, entityId: EntityId, out: Aabb): void {
  if (hasComponent(ctx, entityId, HitGeometry)) {
    const pts = HitGeometry.getExtremaWorld(ctx, entityId)
    Aabb.setFromPoints(out, pts)
  } else {
    const corners = Block.getCorners(ctx, entityId)
    Aabb.setFromPoints(out, corners)
  }
}
