/** 2π - full circle in radians */
export const TAU = Math.PI * 2;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Scalar {
  /**
   * Clamp a value between min and max.
   */
  export const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

  /**
   * Linear interpolation between two values.
   */
  export const lerp = (a: number, b: number, t: number): number =>
    a + (b - a) * t;

  /**
   * Normalize an angle to the range [0, 2π).
   */
  export const normalizeAngle = (angle: number): number => {
    const a = angle % TAU;
    return a < 0 ? a + TAU : a;
  };

  /**
   * Normalize an angle to the range [-π, π).
   */
  export const normalizeAngleSigned = (angle: number): number => {
    const a = normalizeAngle(angle);
    return a > Math.PI ? a - TAU : a;
  };

  /**
   * Check if two angles are approximately equal (within epsilon).
   */
  export const anglesApproxEqual = (
    a: number,
    b: number,
    epsilon = 0.0001
  ): boolean => Math.abs(normalizeAngleSigned(a - b)) < epsilon;
}
