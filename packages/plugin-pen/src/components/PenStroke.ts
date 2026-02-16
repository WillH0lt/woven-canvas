import { CanvasComponentDef, type Context, type EntityId, field } from '@woven-canvas/core'

/**
 * Maximum number of points that can be stored in the stroke.
 * Points are stored as [x, y] pairs, so actual capacity is POINTS_CAPACITY * 2 floats.
 * Pressures are stored separately with POINTS_CAPACITY floats.
 */
export const POINTS_CAPACITY = 256

const PenStrokeSchema = {
  /**
   * Flat buffer of point coordinates [x0, y0, x1, y1, ...]
   * Uses field.buffer for zero-allocation subarray views.
   */
  points: field.buffer(field.float32()).size(POINTS_CAPACITY * 2),

  /**
   * Buffer of pressure values for each point [p0, p1, ...]
   * Values range from 0 to 1, where 0.5 is default (no pressure info).
   */
  pressures: field.buffer(field.float32()).size(POINTS_CAPACITY),

  /**
   * Total number of points in the stroke.
   */
  pointCount: field.uint32().default(0),

  /**
   * Thickness of the stroke in world coordinates.
   */
  thickness: field.float32().default(8),

  /**
   * Original bounds when the stroke was created.
   * Used for computing affine transformations when scaling/rotating.
   */
  originalLeft: field.float32().default(0),
  originalTop: field.float32().default(0),
  originalWidth: field.float32().default(0),
  originalHeight: field.float32().default(0),

  /**
   * Whether the stroke has been completed (pointer released).
   */
  isComplete: field.boolean().default(false),

  /**
   * Whether the stroke has pressure data from a stylus.
   */
  hasPressure: field.boolean().default(false),
}

/**
 * PenStroke component - stores the geometry of a pen/ink stroke.
 *
 * Points are stored as a flat array of floats: [x0, y0, x1, y1, x2, y2, ...]
 * Pressures are stored separately: [p0, p1, p2, ...]
 *
 * The stroke supports pressure sensitivity for stylus input and stores
 * original bounds for proper scaling/rotation transformations.
 */
class PenStrokeDef extends CanvasComponentDef<typeof PenStrokeSchema> {
  constructor() {
    super({ name: 'penStroke', sync: 'document' }, PenStrokeSchema)
  }

  snapshot(ctx: Context, entityId: EntityId) {
    const snap = super.snapshot(ctx, entityId)
    const count = snap.pointCount
    snap.points = snap.points.slice(0, count * 2)
    snap.pressures = snap.hasPressure ? snap.pressures.slice(0, count) : new Float32Array(0)
    return snap
  }
}

export const PenStroke = new PenStrokeDef()
