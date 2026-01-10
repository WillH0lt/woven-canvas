/**
 * A 2D vector represented as a tuple [x, y].
 */
export type Vec2Tuple = [number, number];

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Vec2 {
  // Creation (these allocate by nature)

  export const create = (x: number, y: number): Vec2Tuple => [x, y];

  export const zero = (): Vec2Tuple => [0, 0];

  export const clone = (v: Vec2Tuple): Vec2Tuple => [v[0], v[1]];

  // Geometric (non-mutating, return scalars or allocate)

  export const dot = (a: Vec2Tuple, b: Vec2Tuple): number =>
    a[0] * b[0] + a[1] * b[1];

  export const lengthSq = (v: Vec2Tuple): number => v[0] * v[0] + v[1] * v[1];

  export const length = (v: Vec2Tuple): number => Math.hypot(v[0], v[1]);

  export const distance = (a: Vec2Tuple, b: Vec2Tuple): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.hypot(dx, dy);
  };

  export const distanceSq = (a: Vec2Tuple, b: Vec2Tuple): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return dx * dx + dy * dy;
  };

  /**
   * Get the angle from point `from` to point `to` in radians.
   * Returns angle in range [-π, π].
   */
  export const angleTo = (from: Vec2Tuple, to: Vec2Tuple): number =>
    Math.atan2(to[1] - from[1], to[0] - from[0]);

  /**
   * Get the angle of a vector from the origin in radians.
   * Returns angle in range [-π, π].
   */
  export const angle = (v: Vec2Tuple): number => Math.atan2(v[1], v[0]);

  /**
   * Create a Vec2 from polar coordinates (radius and angle).
   * Optionally offset by a center point.
   */
  export const fromPolar = (
    radius: number,
    angle: number,
    center: Vec2Tuple = [0, 0]
  ): Vec2Tuple => [
    center[0] + Math.cos(angle) * radius,
    center[1] + Math.sin(angle) * radius,
  ];

  // Operations (mutating) - modify first argument in-place, return void

  export const set = (out: Vec2Tuple, x: number, y: number): void => {
    out[0] = x;
    out[1] = y;
  };

  export const copy = (out: Vec2Tuple, v: Vec2Tuple): void => {
    out[0] = v[0];
    out[1] = v[1];
  };

  export const add = (out: Vec2Tuple, v: Vec2Tuple): void => {
    out[0] += v[0];
    out[1] += v[1];
  };

  /**
   * Add a scalar to both components of a vector.
   */
  export const addScalar = (out: Vec2Tuple, s: number): void => {
    out[0] += s;
    out[1] += s;
  };

  export const sub = (out: Vec2Tuple, v: Vec2Tuple): void => {
    out[0] -= v[0];
    out[1] -= v[1];
  };

  export const scale = (out: Vec2Tuple, s: number): void => {
    out[0] *= s;
    out[1] *= s;
  };

  /**
   * Component-wise multiplication of two vectors.
   */
  export const multiply = (out: Vec2Tuple, v: Vec2Tuple): void => {
    out[0] *= v[0];
    out[1] *= v[1];
  };

  /**
   * Component-wise division of two vectors.
   * Warns and divides by 1 if divisor component is 0.
   */
  export const divide = (out: Vec2Tuple, v: Vec2Tuple): void => {
    if (v[0] === 0 || v[1] === 0) {
      console.warn("Vec2.divide: division by zero, using 1 as divisor");
    }
    out[0] /= v[0] || 1;
    out[1] /= v[1] || 1;
  };

  export const negate = (out: Vec2Tuple): void => {
    out[0] = -out[0];
    out[1] = -out[1];
  };

  export const normalize = (out: Vec2Tuple): void => {
    const len = length(out);
    if (len > 0) {
      out[0] /= len;
      out[1] /= len;
    }
  };

  /**
   * Rotate a vector around the origin by an angle in radians.
   */
  export const rotate = (out: Vec2Tuple, angle: number): void => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = out[0] * cos - out[1] * sin;
    const y = out[0] * sin + out[1] * cos;
    out[0] = x;
    out[1] = y;
  };

  /**
   * Rotate a vector around a pivot point by an angle in radians.
   */
  export const rotateAround = (
    out: Vec2Tuple,
    pivot: Vec2Tuple,
    angle: number
  ): void => {
    sub(out, pivot);
    rotate(out, angle);
    add(out, pivot);
  };
}

// Re-export type with same name for convenience
export type Vec2 = Vec2Tuple;
