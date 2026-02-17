/**
 * Default radius for eraser strokes in world coordinates.
 * Determines the size of the eraser's collision area.
 */
export const STROKE_RADIUS = 8

/**
 * Plugin name used for registration and resource lookup.
 */
export const PLUGIN_NAME = 'eraser'

/**
 * Maximum number of points that can be stored in the stroke.
 * Points are stored as [x, y] pairs, so actual capacity is POINTS_CAPACITY * 2 floats.
 */
export const POINTS_CAPACITY = 20
