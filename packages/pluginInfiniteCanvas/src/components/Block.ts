import {
  field,
  EditorComponentDef,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Vec2 } from "@infinitecanvas/math";

// Vec2 tuple indices
const X = 0;
const Y = 1;

// Internal temp vectors for methods that return Vec2
// These are safe because they're copied to `out` before returning
const _tempCenter: Vec2 = [0, 0];
const _tempCorners: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

// Internal temp vector for transform methods (not returned to caller)
const _tempVec: Vec2 = [0, 0];

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
  getCenter(ctx: Context, entityId: EntityId, out: Vec2 = _tempCenter): Vec2 {
    const { position, size } = this.read(ctx, entityId);
    Vec2.set(out, position[X] + size[X] / 2, position[Y] + size[Y] / 2);
    return out;
  }

  /**
   * Set the center point of a block (adjusts position accordingly).
   */
  setCenter(ctx: Context, entityId: EntityId, center: Vec2): void {
    const block = this.write(ctx, entityId);
    const halfW = block.size[X] / 2;
    const halfH = block.size[Y] / 2;
    Vec2.set(block.position, center[X] - halfW, center[Y] - halfH);
  }

  /**
   * Get the four corner points of a block (accounting for rotation).
   * Returns corners in order: top-left, top-right, bottom-right, bottom-left.
   * @param out - Optional output array to write to (avoids allocation)
   */
  getCorners(
    ctx: Context,
    entityId: EntityId,
    out: [Vec2, Vec2, Vec2, Vec2] = _tempCorners
  ): [Vec2, Vec2, Vec2, Vec2] {
    const { position, size, rotateZ } = this.read(ctx, entityId);

    const halfWidth = size[X] / 2;
    const halfHeight = size[Y] / 2;
    const centerX = position[X] + halfWidth;
    const centerY = position[Y] + halfHeight;

    // Local corner offsets relative to center
    const offsets = [
      -halfWidth,
      -halfHeight, // top-left
      halfWidth,
      -halfHeight, // top-right
      halfWidth,
      halfHeight, // bottom-right
      -halfWidth,
      halfHeight, // bottom-left
    ];

    const cos = Math.cos(rotateZ);
    const sin = Math.sin(rotateZ);

    // Rotate each corner around center and write to out
    for (let i = 0; i < 4; i++) {
      const ox = offsets[i * 2];
      const oy = offsets[i * 2 + 1];
      // Rotate offset and add center
      out[i][X] = centerX + ox * cos - oy * sin;
      out[i][Y] = centerY + ox * sin + oy * cos;
    }

    return out;
  }

  /**
   * Check if a point intersects a block (accounting for rotation).
   * Optimized to avoid allocations - called frequently during hit testing.
   */
  containsPoint(ctx: Context, entityId: EntityId, point: Vec2): boolean {
    const { position, size, rotateZ } = this.read(ctx, entityId);

    const halfWidth = size[X] / 2;
    const halfHeight = size[Y] / 2;
    const centerX = position[X] + halfWidth;
    const centerY = position[Y] + halfHeight;

    // Translate point relative to center
    const dx = point[X] - centerX;
    const dy = point[Y] - centerY;

    // Rotate point in opposite direction to get local coordinates
    const cos = Math.cos(-rotateZ);
    const sin = Math.sin(-rotateZ);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    return (
      localX >= -halfWidth &&
      localX <= halfWidth &&
      localY >= -halfHeight &&
      localY <= halfHeight
    );
  }

  /**
   * Move a block by a delta offset.
   */
  translate(ctx: Context, entityId: EntityId, delta: Vec2): void {
    const block = this.write(ctx, entityId);
    Vec2.add(block.position, delta);
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
  rotateAroundPivot(
    ctx: Context,
    entityId: EntityId,
    pivot: Vec2,
    angle: number
  ): void {
    const block = this.write(ctx, entityId);
    // center = position + size * 0.5
    Vec2.copy(_tempVec, block.size);
    Vec2.scale(_tempVec, 0.5);
    Vec2.add(_tempVec, block.position);
    // newCenter = rotateAround(center, pivot, angle)
    Vec2.rotateAround(_tempVec, pivot, angle);
    // position = newCenter - halfSize
    const halfW = block.size[X] / 2;
    const halfH = block.size[Y] / 2;
    Vec2.set(block.position, _tempVec[X] - halfW, _tempVec[Y] - halfH);
    block.rotateZ += angle;
  }

  /**
   * Scale a block uniformly around its center.
   */
  scaleBy(ctx: Context, entityId: EntityId, scaleFactor: number): void {
    const block = this.write(ctx, entityId);
    // center = position + size * 0.5
    Vec2.copy(_tempVec, block.size);
    Vec2.scale(_tempVec, 0.5);
    Vec2.add(_tempVec, block.position);
    // newSize = size * scaleFactor
    Vec2.scale(block.size, scaleFactor);
    // position = center - newSize * 0.5
    const halfW = block.size[X] / 2;
    const halfH = block.size[Y] / 2;
    Vec2.set(block.position, _tempVec[X] - halfW, _tempVec[Y] - halfH);
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
    // center = position + size * 0.5
    Vec2.copy(_tempVec, block.size);
    Vec2.scale(_tempVec, 0.5);
    Vec2.add(_tempVec, block.position);
    // delta = center - pivot, then scale
    Vec2.sub(_tempVec, pivot);
    Vec2.scale(_tempVec, scaleFactor);
    // newCenter = pivot + scaledDelta
    Vec2.add(_tempVec, pivot);
    // Scale size in place
    Vec2.scale(block.size, scaleFactor);
    // position = newCenter - newSize * 0.5
    const halfW = block.size[X] / 2;
    const halfH = block.size[Y] / 2;
    Vec2.set(block.position, _tempVec[X] - halfW, _tempVec[Y] - halfH);
  }
}

export const Block = new BlockDef();
