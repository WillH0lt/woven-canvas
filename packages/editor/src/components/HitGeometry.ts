import { field, type Context, type EntityId } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";
import {
  type CapsuleTuple,
  type Vec2,
  type Aabb as AabbTuple,
  Capsule,
  Arc,
} from "@infinitecanvas/math";

/**
 * Maximum number of capsules that can be stored in the hitCapsules array.
 * Each capsule takes 5 floats: ax, ay, bx, by, radius
 */
export const MAX_HIT_CAPSULES = 64;

/**
 * Number of floats per capsule in the hitCapsules array.
 */
export const FLOATS_PER_CAPSULE = 5;

const HitGeometrySchema = {
  hitCapsules: field
    .buffer(field.float32())
    .size(MAX_HIT_CAPSULES * FLOATS_PER_CAPSULE),
  capsuleCount: field.uint16().default(0),
  /** Arc hit geometry: [ax, ay, bx, by, cx, cy, thickness] */
  hitArc: field.tuple(field.float32(), 7).default([0, 0, 0, 0, 0, 0, 0]),
  hasArc: field.boolean().default(false),
};

/**
 * HitGeometry component - stores collision geometry for an entity.
 *
 * The hitCapsules buffer stores capsule data as a flat array of floats:
 * [ax0, ay0, bx0, by0, r0, ax1, ay1, bx1, by1, r1, ...]
 *
 * Each capsule is defined by:
 * - ax, ay: First endpoint of the capsule's center line
 * - bx, by: Second endpoint of the capsule's center line
 * - radius: The radius of the capsule
 *
 * Uses field.buffer for zero-allocation subarray views.
 * Used for collision detection with eraser strokes and other tools.
 */
class HitGeometryDef extends EditorComponentDef<typeof HitGeometrySchema> {
  constructor() {
    super("hit-geometry", HitGeometrySchema, { sync: "document" });
  }

  /**
   * Get a capsule at a specific index from the hitCapsules buffer.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param index - Index of the capsule (0-based)
   * @returns Capsule tuple [ax, ay, bx, by, radius]
   */
  getCapsuleAt(ctx: Context, entityId: EntityId, index: number): CapsuleTuple {
    const hitGeometry = this.read(ctx, entityId);
    const offset = index * FLOATS_PER_CAPSULE;
    return [
      hitGeometry.hitCapsules[offset],
      hitGeometry.hitCapsules[offset + 1],
      hitGeometry.hitCapsules[offset + 2],
      hitGeometry.hitCapsules[offset + 3],
      hitGeometry.hitCapsules[offset + 4],
    ];
  }

  /**
   * Set a capsule at a specific index in the hitCapsules buffer.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param index - Index of the capsule (0-based)
   * @param capsule - Capsule tuple [ax, ay, bx, by, radius]
   */
  setCapsuleAt(
    ctx: Context,
    entityId: EntityId,
    index: number,
    capsule: CapsuleTuple
  ): void {
    const hitGeometry = this.write(ctx, entityId);
    const offset = index * FLOATS_PER_CAPSULE;
    for (let i = 0; i < FLOATS_PER_CAPSULE; i++) {
      hitGeometry.hitCapsules[offset + i] = capsule[i];
    }
  }

  /**
   * Check if a point is inside the entity's hit geometry.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param point - Point to test [x, y]
   * @returns True if the point is inside any of the entity's hit capsules or arc
   */
  containsPoint(ctx: Context, entityId: EntityId, point: Vec2): boolean {
    const hitGeometry = this.read(ctx, entityId);

    // Check arc intersection
    if (hitGeometry.hasArc) {
      if (Arc.containsPoint(hitGeometry.hitArc, point)) {
        return true;
      }
    }

    // Check capsule intersections
    for (let i = 0; i < hitGeometry.capsuleCount; i++) {
      const hitCapsule = this.getCapsuleAt(ctx, entityId, i);

      if (Capsule.containsPoint(hitCapsule, point)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an AABB intersects with the entity's hit geometry.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param aabb - AABB to test [left, top, right, bottom]
   * @returns True if the AABB intersects any of the entity's hit capsules or arc
   */
  intersectsAabb(ctx: Context, entityId: EntityId, aabb: AabbTuple): boolean {
    const hitGeometry = this.read(ctx, entityId);

    // Check arc intersection
    if (hitGeometry.hasArc) {
      if (Arc.intersectsAabb(hitGeometry.hitArc, aabb)) {
        return true;
      }
    }

    // Check capsule intersections
    for (let i = 0; i < hitGeometry.capsuleCount; i++) {
      const hitCapsule = this.getCapsuleAt(ctx, entityId, i);

      if (Capsule.intersectsAabb(hitCapsule, aabb)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all extrema points of the hit geometry for AABB computation.
   * Returns corner points expanded by radius/thickness for each capsule and arc.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @returns Array of extrema points
   */
  getExtrema(ctx: Context, entityId: EntityId): Vec2[] {
    const hitGeometry = this.read(ctx, entityId);
    const pts: Vec2[] = [];

    // Add extrema from capsules
    for (let i = 0; i < hitGeometry.capsuleCount; i++) {
      const capsule = this.getCapsuleAt(ctx, entityId, i);
      pts.push(...Capsule.getExtrema(capsule));
    }

    // Add extrema from arc
    if (hitGeometry.hasArc) {
      pts.push(...Arc.getExtrema(hitGeometry.hitArc));
    }

    return pts;
  }
}

export const HitGeometry = new HitGeometryDef();
