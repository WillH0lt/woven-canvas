import {
  field,
  EditorComponentDef,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Vec2, Rect, type Aabb as AabbTuple } from "@infinitecanvas/math";

// Pre-allocated arrays for SAT intersection to avoid allocations
const _aabbCorners: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];
const _blockCorners: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];
const _blockAxes: [Vec2, Vec2] = [
  [0, 0],
  [0, 0],
];

const BlockSchema = {
  /** Element tag name (e.g., "div", "img") */
  tag: field.string().max(36).default("div"),
  /** Position as [left, top] */
  position: field.tuple(field.float64(), 2).default([0, 0]),
  /** Size as [width, height] */
  size: field.tuple(field.float64(), 2).default([100, 100]),
  /** Rotation around center in radians */
  rotateZ: field.float64().default(0),
  /** Z-order rank (LexoRank string) */
  rank: field.string().max(36).default(""),
};

/**
 * Block component - core spatial data for canvas entities.
 *
 * Contains position (left, top), size (width, height), rotation (rotateZ),
 * z-order (rank), and element tag.
 */
class BlockDef extends EditorComponentDef<typeof BlockSchema> {
  constructor() {
    super("block", BlockSchema, { sync: "document" });
  }

  /**
   * Get the center point of a block.
   * @param out - Optional output vector to write to (avoids allocation)
   */
  getCenter(ctx: Context, entityId: EntityId, out?: Vec2): Vec2 {
    const { position, size } = this.read(ctx, entityId);
    const result: Vec2 = out ?? [0, 0];
    Rect.getCenter(position, size, result);
    return result;
  }

  /**
   * Set the center point of a block (adjusts position accordingly).
   */
  setCenter(ctx: Context, entityId: EntityId, center: Vec2): void {
    const block = this.write(ctx, entityId);
    Rect.setCenter(block.position, block.size, center);
  }

  /**
   * Get the four corner points of a block (accounting for rotation).
   * Returns corners in order: top-left, top-right, bottom-right, bottom-left.
   * @param out - Optional output array to write to (avoids allocation)
   */
  getCorners(
    ctx: Context,
    entityId: EntityId,
    out?: [Vec2, Vec2, Vec2, Vec2]
  ): [Vec2, Vec2, Vec2, Vec2] {
    const { position, size, rotateZ } = this.read(ctx, entityId);
    const result: [Vec2, Vec2, Vec2, Vec2] = out ?? [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    Rect.getCorners(position, size, rotateZ, result);
    return result;
  }

  /**
   * Check if a point intersects a block (accounting for rotation).
   */
  containsPoint(ctx: Context, entityId: EntityId, point: Vec2): boolean {
    const { position, size, rotateZ } = this.read(ctx, entityId);
    return Rect.containsPoint(position, size, rotateZ, point);
  }

  /**
   * Move a block by a delta offset.
   */
  translate(ctx: Context, entityId: EntityId, delta: Vec2): void {
    const block = this.write(ctx, entityId);
    Rect.translate(block.position, delta);
  }

  /**
   * Set the position of a block.
   */
  setPosition(ctx: Context, entityId: EntityId, position: Vec2): void {
    const block = this.write(ctx, entityId);
    Vec2.copy(block.position, position);
  }

  /**
   * Set the size of a block.
   */
  setSize(ctx: Context, entityId: EntityId, size: Vec2): void {
    const block = this.write(ctx, entityId);
    Vec2.copy(block.size, size);
  }

  /**
   * Rotate a block by a delta angle (in radians).
   */
  rotateBy(ctx: Context, entityId: EntityId, deltaAngle: number): void {
    const block = this.write(ctx, entityId);
    block.rotateZ += deltaAngle;
  }

  /**
   * Rotate a block around a pivot point.
   */
  rotateAround(
    ctx: Context,
    entityId: EntityId,
    pivot: Vec2,
    angle: number
  ): void {
    const block = this.write(ctx, entityId);
    block.rotateZ = Rect.rotateAround(
      block.position,
      block.size,
      block.rotateZ,
      pivot,
      angle
    );
  }

  /**
   * Scale a block uniformly around its center.
   */
  scaleBy(ctx: Context, entityId: EntityId, scaleFactor: number): void {
    const block = this.write(ctx, entityId);
    Rect.scaleBy(block.position, block.size, scaleFactor);
  }

  /**
   * Scale a block around a pivot point.
   */
  scaleAround(
    ctx: Context,
    entityId: EntityId,
    pivot: Vec2,
    scaleFactor: number
  ): void {
    const block = this.write(ctx, entityId);
    Rect.scaleAround(block.position, block.size, pivot, scaleFactor);
  }

  /**
   * Check if an AABB intersects with this block using Separating Axis Theorem.
   * This handles all intersection cases including narrow AABBs that pass through
   * the middle of a rotated block without touching any corners.
   * Optimized to avoid allocations for hot path usage.
   */
  intersectsAabb(ctx: Context, entityId: EntityId, aabb: AabbTuple): boolean {
    const { position, size, rotateZ } = this.read(ctx, entityId);
    return Rect.intersectsAabb(
      position,
      size,
      rotateZ,
      aabb,
      _blockCorners,
      _aabbCorners,
      _blockAxes
    );
  }
}

export const Block = new BlockDef();
