import {
  field,
  EditorComponentDef,
  Block,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Rect, type Vec2 } from "@infinitecanvas/math";
import { ArrowHeadKind } from "../types";
import { DEFAULT_ARROW_THICKNESS, ELBOW_ARROW_CAPACITY } from "../constants";

const ElbowArrowSchema = {
  /**
   * Flat buffer of point coordinates [x0, y0, x1, y1, ...]
   * Stored as UV coordinates relative to block bounds.
   */
  points: field.buffer(field.float64()).size(ELBOW_ARROW_CAPACITY * 2),

  /**
   * Number of points in the path.
   */
  pointCount: field.uint8().default(0),

  /** Line thickness in pixels */
  thickness: field.float32().default(DEFAULT_ARROW_THICKNESS),

  /** Arrow head at start point */
  startArrowHead: field.enum(ArrowHeadKind).default(ArrowHeadKind.None),

  /** Arrow head at end point */
  endArrowHead: field.enum(ArrowHeadKind).default(ArrowHeadKind.V),
};

/**
 * ElbowArrow component - stores the geometry of an elbow (orthogonal) arrow.
 *
 * Points are stored in a flat array as UV coordinates (0-1) relative to block bounds.
 * The path consists of horizontal and vertical segments that route around obstacles.
 */
class ElbowArrowDef extends EditorComponentDef<typeof ElbowArrowSchema> {
  constructor() {
    super("elbow-arrow", ElbowArrowSchema, { sync: "document" });
  }

  /**
   * Get a point at the given index in UV coordinates.
   */
  getPoint(ctx: Context, entityId: EntityId, index: number): Vec2 {
    const { points } = this.read(ctx, entityId);
    return [points[index * 2], points[index * 2 + 1]];
  }

  /**
   * Set a point at the given index in UV coordinates.
   */
  setPoint(ctx: Context, entityId: EntityId, index: number, point: Vec2): void {
    const { points } = this.write(ctx, entityId);
    points[index * 2] = point[0];
    points[index * 2 + 1] = point[1];
  }

  /**
   * Get all points as an array of UV coordinates.
   */
  getPoints(ctx: Context, entityId: EntityId): Vec2[] {
    const { points, pointCount } = this.read(ctx, entityId);
    const result: Vec2[] = [];

    for (let i = 0; i < pointCount; i++) {
      result.push([points[i * 2], points[i * 2 + 1]]);
    }

    return result;
  }

  /**
   * Set all points from an array of UV coordinates.
   */
  setPoints(ctx: Context, entityId: EntityId, uvPoints: Vec2[]): void {
    if (uvPoints.length > ELBOW_ARROW_CAPACITY) {
      throw new Error(
        `ElbowArrow points exceed capacity of ${ELBOW_ARROW_CAPACITY}`
      );
    }

    const arrow = this.write(ctx, entityId);

    for (let i = 0; i < uvPoints.length; i++) {
      arrow.points[i * 2] = uvPoints[i][0];
      arrow.points[i * 2 + 1] = uvPoints[i][1];
    }

    arrow.pointCount = uvPoints.length;
  }

  /**
   * Convert UV coordinates to world coordinates using the entity's Block.
   * Accounts for block rotation.
   */
  uvToWorld(ctx: Context, entityId: EntityId, uv: Vec2): Vec2 {
    const { position, size, rotateZ } = Block.read(ctx, entityId);
    return Rect.uvToWorld(position, size, rotateZ, uv);
  }

  /**
   * Convert world coordinates to UV coordinates using the entity's Block.
   * Accounts for block rotation.
   */
  worldToUv(ctx: Context, entityId: EntityId, world: Vec2): Vec2 {
    const { position, size, rotateZ } = Block.read(ctx, entityId);
    return Rect.worldToUv(position, size, rotateZ, world);
  }

  /**
   * Get start point in world coordinates.
   */
  getStartWorld(ctx: Context, entityId: EntityId): Vec2 {
    const startUv = this.getPoint(ctx, entityId, 0);
    return this.uvToWorld(ctx, entityId, startUv);
  }

  /**
   * Get end point in world coordinates.
   */
  getEndWorld(ctx: Context, entityId: EntityId): Vec2 {
    const { pointCount } = this.read(ctx, entityId);
    const endUv = this.getPoint(ctx, entityId, pointCount - 1);
    return this.uvToWorld(ctx, entityId, endUv);
  }

  /**
   * Get all points in world coordinates.
   */
  getWorldPoints(ctx: Context, entityId: EntityId): Vec2[] {
    const uvPoints = this.getPoints(ctx, entityId);
    return uvPoints.map((uv) => this.uvToWorld(ctx, entityId, uv));
  }

  /**
   * Get the thickness of the arrow.
   */
  getThickness(ctx: Context, entityId: EntityId): number {
    const { thickness } = this.read(ctx, entityId);
    return thickness;
  }
}

export const ElbowArrow = new ElbowArrowDef();
