import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * Maximum number of points that can be stored in the stroke.
 * Points are stored as [x, y] pairs, so actual capacity is POINTS_CAPACITY * 2 floats.
 * Pressures are stored separately with POINTS_CAPACITY floats.
 */
export const POINTS_CAPACITY = 256;

/**
 * PenStroke component - stores the geometry of a pen/ink stroke.
 *
 * Points are stored as a flat array of floats: [x0, y0, x1, y1, x2, y2, ...]
 * Pressures are stored separately: [p0, p1, p2, ...]
 *
 * The stroke supports pressure sensitivity for stylus input and stores
 * original bounds for proper scaling/rotation transformations.
 */
export const PenStroke = defineEditorComponent(
  "penStroke",
  {
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
  },
  { sync: "document" }
);
