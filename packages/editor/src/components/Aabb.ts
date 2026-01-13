import { field, type Context, type EntityId } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";
import {
  Aabb as AabbNs,
  type Aabb as AabbTuple,
  type Vec2,
} from "@infinitecanvas/math";
import { Block } from "./Block";

// Tuple indices for AABB
const LEFT = 0;
const TOP = 1;
const RIGHT = 2;
const BOTTOM = 3;

const AabbSchema = {
  /** Bounds as [left, top, right, bottom] */
  value: field.tuple(field.float32(), 4).default([0, 0, 0, 0]),
};

/**
 * Axis-aligned bounding box component.
 *
 * Stored as a tuple [left, top, right, bottom] for memory efficiency.
 * Used for fast intersection tests and spatial queries.
 * Updated automatically when Block transforms change.
 */
class AabbDef extends EditorComponentDef<typeof AabbSchema> {
  constructor() {
    super("aabb", AabbSchema, { sync: "none" });
  }

  /**
   * Check if a point is contained within an entity's AABB.
   */
  containsPoint(
    ctx: Context,
    entityId: EntityId,
    point: Vec2,
    inclusive = true
  ): boolean {
    const { value } = this.read(ctx, entityId);

    return AabbNs.containsPoint(value, point, inclusive);
  }

  /**
   * Expand AABB to include a point.
   */
  expandByPoint(ctx: Context, entityId: EntityId, point: Vec2): void {
    const { value } = this.write(ctx, entityId);
    AabbNs.expand(value, point);
  }

  /**
   * Expand AABB to include another entity's block.
   */
  expandByBlock(
    ctx: Context,
    entityId: EntityId,
    blockEntityId: EntityId
  ): void {
    const corners = Block.getCorners(ctx, blockEntityId);
    const { value } = this.write(ctx, entityId);
    for (const corner of corners) {
      AabbNs.expand(value, corner);
    }
  }

  /**
   * Expand AABB to include another AABB.
   */
  expandByAabb(ctx: Context, entityId: EntityId, other: AabbTuple): void {
    const { value } = this.write(ctx, entityId);
    AabbNs.union(value, other);
  }

  /**
   * Copy bounds from another entity's AABB.
   */
  copyFrom(ctx: Context, entityId: EntityId, otherEntityId: EntityId): void {
    const { value: src } = this.read(ctx, otherEntityId);
    const { value: dst } = this.write(ctx, entityId);
    AabbNs.copy(dst, src);
  }

  /**
   * Set AABB from an array of points.
   */
  setByPoints(ctx: Context, entityId: EntityId, points: Vec2[]): void {
    if (points.length === 0) return;
    const { value } = this.write(ctx, entityId);
    AabbNs.setFromPoints(value, points);
  }

  /**
   * Get the center point of an entity's AABB.
   */
  getCenter(ctx: Context, entityId: EntityId): Vec2 {
    const { value } = this.read(ctx, entityId);
    return AabbNs.center(value);
  }

  /**
   * Get the width of an entity's AABB.
   */
  getWidth(ctx: Context, entityId: EntityId): number {
    const { value } = this.read(ctx, entityId);
    return AabbNs.width(value);
  }

  /**
   * Get the height of an entity's AABB.
   */
  getHeight(ctx: Context, entityId: EntityId): number {
    const { value } = this.read(ctx, entityId);
    return AabbNs.height(value);
  }

  /**
   * Get the distance from AABB to a point.
   */
  distanceToPoint(ctx: Context, entityId: EntityId, point: Vec2): number {
    const { value } = this.read(ctx, entityId);
    return AabbNs.distanceToPoint(value, point);
  }

  /**
   * Check if two entity AABBs intersect.
   */
  intersectsEntity(
    ctx: Context,
    entityIdA: EntityId,
    entityIdB: EntityId
  ): boolean {
    const { value: a } = this.read(ctx, entityIdA);
    const { value: b } = this.read(ctx, entityIdB);
    return AabbNs.intersects(a, b);
  }

  /**
   * Check if entity A's AABB completely surrounds entity B's AABB.
   */
  surroundsEntity(
    ctx: Context,
    entityIdA: EntityId,
    entityIdB: EntityId
  ): boolean {
    const { value: a } = this.read(ctx, entityIdA);
    const { value: b } = this.read(ctx, entityIdB);
    return AabbNs.contains(a, b);
  }

  /**
   * Get the four corner points of an entity's AABB.
   * Returns corners in order: top-left, top-right, bottom-right, bottom-left.
   * @param out - Optional output array to write to (avoids allocation)
   */
  getCorners(
    ctx: Context,
    entityId: EntityId,
    out?: [Vec2, Vec2, Vec2, Vec2]
  ): [Vec2, Vec2, Vec2, Vec2] {
    const { value } = this.read(ctx, entityId);
    const result: [Vec2, Vec2, Vec2, Vec2] = out ?? [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    // TL
    result[0][0] = value[LEFT];
    result[0][1] = value[TOP];
    // TR
    result[1][0] = value[RIGHT];
    result[1][1] = value[TOP];
    // BR
    result[2][0] = value[RIGHT];
    result[2][1] = value[BOTTOM];
    // BL
    result[3][0] = value[LEFT];
    result[3][1] = value[BOTTOM];
    return result;
  }

  /**
   * Apply padding to all sides of the AABB.
   */
  applyPadding(ctx: Context, entityId: EntityId, padding: number): void {
    const { value } = this.write(ctx, entityId);
    AabbNs.pad(value, padding);
  }
}

export const Aabb = new AabbDef();
