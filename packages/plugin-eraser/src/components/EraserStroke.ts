import { field, defineCanvasComponent } from "@infinitecanvas/core";

/**
 * Maximum number of points that can be stored in the stroke.
 * Points are stored as [x, y] pairs, so actual capacity is POINTS_CAPACITY * 2 floats.
 */
export const POINTS_CAPACITY = 10;

/**
 * EraserStroke component - stores the geometry of an eraser stroke.
 *
 * Points are stored in a circular buffer as a flat array of floats:
 * [x0, y0, x1, y1, x2, y2, ...]
 *
 * The stroke is rendered as a series of connected capsules between
 * consecutive points, with the specified radius.
 */
export const EraserStroke = defineCanvasComponent(
  { name: "eraserStroke" },
  {
    /**
     * Flat buffer of point coordinates [x0, y0, x1, y1, ...]
     * Stored as a circular buffer when pointCount exceeds capacity.
     * Uses field.buffer for zero-allocation subarray views.
     */
    points: field.buffer(field.float32()).size(POINTS_CAPACITY * 2),

    /**
     * Total number of points added to the stroke.
     * May exceed POINTS_CAPACITY; older points are overwritten in circular buffer.
     */
    pointCount: field.uint32().default(0),

    /**
     * Index of the first (oldest) point in the circular buffer.
     * Used to iterate through points in order.
     */
    firstPointIndex: field.uint32().default(0),

    /**
     * Radius of the eraser stroke in world coordinates.
     */
    radius: field.float32().default(8),
  }
);
