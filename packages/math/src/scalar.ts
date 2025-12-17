/**
 * Clamp a value between min and max.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Linear interpolation between two values.
 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
