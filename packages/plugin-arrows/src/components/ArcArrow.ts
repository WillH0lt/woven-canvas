import {
  field,
  EditorComponentDef,
  Block,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Arc, Vec2 } from "@infinitecanvas/math";
import { ArrowHeadKind } from "../types";
import { DEFAULT_ARROW_THICKNESS } from "../constants";

// Tuple indices for the arc value
const AX = 0;
const AY = 1;
const BX = 2;
const BY = 3;
const CX = 4;
const CY = 5;
const THICKNESS = 6;

const ArcArrowSchema = {
  /**
   * Arc geometry as [aX, aY, bX, bY, cX, cY, thickness]
   * - aX, aY: Start point in UV coordinates
   * - bX, bY: Control point in UV coordinates
   * - cX, cY: End point in UV coordinates
   * - thickness: Line thickness in pixels
   */
  value: field
    .tuple(field.float64(), 7)
    .default([0, 0, 0.5, 0.5, 1, 1, DEFAULT_ARROW_THICKNESS]),

  /** Arrow head at start point */
  startArrowHead: field.enum(ArrowHeadKind).default(ArrowHeadKind.None),

  /** Arrow head at end point */
  endArrowHead: field.enum(ArrowHeadKind).default(ArrowHeadKind.V),
};

/**
 * ArcArrow component - stores the geometry of an arc (curved) arrow.
 *
 * The arc is stored as a tuple of 7 values:
 * [aX, aY, bX, bY, cX, cY, thickness]
 *
 * Points are stored in UV coordinates (0-1) relative to the block bounds.
 * - `a` (indices 0-1): Start point
 * - `b` (indices 2-3): Control point (determines the curve)
 * - `c` (indices 4-5): End point
 * - thickness (index 6): Line thickness in pixels
 */
class ArcArrowDef extends EditorComponentDef<typeof ArcArrowSchema> {
  constructor() {
    super("arc-arrow", ArcArrowSchema, { sync: "document" });
  }

  /**
   * Get the start point (a) in UV coordinates.
   */
  getA(ctx: Context, entityId: EntityId): Vec2 {
    const { value } = this.read(ctx, entityId);
    return [value[AX], value[AY]];
  }

  /**
   * Get the control point (b) in UV coordinates.
   */
  getB(ctx: Context, entityId: EntityId): Vec2 {
    const { value } = this.read(ctx, entityId);
    return [value[BX], value[BY]];
  }

  /**
   * Get the end point (c) in UV coordinates.
   */
  getC(ctx: Context, entityId: EntityId): Vec2 {
    const { value } = this.read(ctx, entityId);
    return [value[CX], value[CY]];
  }

  /**
   * Get the thickness of the arc.
   */
  getThickness(ctx: Context, entityId: EntityId): number {
    const { value } = this.read(ctx, entityId);
    return value[THICKNESS];
  }

  /**
   * Set the start point (a) in UV coordinates.
   */
  setA(ctx: Context, entityId: EntityId, uv: Vec2): void {
    const { value } = this.write(ctx, entityId);
    value[AX] = uv[0];
    value[AY] = uv[1];
  }

  /**
   * Set the control point (b) in UV coordinates.
   */
  setB(ctx: Context, entityId: EntityId, uv: Vec2): void {
    const { value } = this.write(ctx, entityId);
    value[BX] = uv[0];
    value[BY] = uv[1];
  }

  /**
   * Set the end point (c) in UV coordinates.
   */
  setC(ctx: Context, entityId: EntityId, uv: Vec2): void {
    const { value } = this.write(ctx, entityId);
    value[CX] = uv[0];
    value[CY] = uv[1];
  }

  /**
   * Set the thickness of the arc.
   */
  setThickness(ctx: Context, entityId: EntityId, thickness: number): void {
    const { value } = this.write(ctx, entityId);
    value[THICKNESS] = thickness;
  }

  /**
   * Get the arc as a world-space Arc tuple (for use with math library).
   * Accounts for block rotation.
   */
  getWorldArc(ctx: Context, entityId: EntityId): Arc {
    const { value } = this.read(ctx, entityId);

    const a = Block.uvToWorld(ctx, entityId, [value[AX], value[AY]]);
    const b = Block.uvToWorld(ctx, entityId, [value[BX], value[BY]]);
    const c = Block.uvToWorld(ctx, entityId, [value[CX], value[CY]]);

    return [a[0], a[1], b[0], b[1], c[0], c[1], value[THICKNESS]];
  }

  /**
   * Get world coordinates of all three arc points.
   * Accounts for block rotation.
   */
  getWorldPoints(
    ctx: Context,
    entityId: EntityId
  ): { a: Vec2; b: Vec2; c: Vec2 } {
    const { value } = this.read(ctx, entityId);

    return {
      a: Block.uvToWorld(ctx, entityId, [value[AX], value[AY]]),
      b: Block.uvToWorld(ctx, entityId, [value[BX], value[BY]]),
      c: Block.uvToWorld(ctx, entityId, [value[CX], value[CY]]),
    };
  }

  /**
   * Check if the arc is curved (not a straight line).
   * Returns true if the three points are not collinear.
   */
  isCurved(ctx: Context, entityId: EntityId): boolean {
    const { value } = this.read(ctx, entityId);
    // Use the Arc namespace to check collinearity
    return !Arc.isCollinear(value);
  }

  /**
   * Get the direction vector at a parametric position on the arc.
   */
  directionAt(ctx: Context, entityId: EntityId, t: number): Vec2 {
    const arc = this.getWorldArc(ctx, entityId);
    return Arc.directionAt(arc, t);
  }

  /**
   * Get a point on the arc at a parametric position.
   */
  pointAt(ctx: Context, entityId: EntityId, t: number): Vec2 {
    const arc = this.getWorldArc(ctx, entityId);
    return Arc.parametricToPoint(arc, t);
  }

  /**
   * Get the arc length in world coordinates.
   */
  length(ctx: Context, entityId: EntityId): number {
    const arc = this.getWorldArc(ctx, entityId);
    return Arc.length(arc);
  }

  /**
   * Check if a world-space point lies on the arc.
   */
  containsPoint(ctx: Context, entityId: EntityId, point: Vec2): boolean {
    const arc = this.getWorldArc(ctx, entityId);
    return Arc.containsPoint(arc, point);
  }
}

export const ArcArrow = new ArcArrowDef();
