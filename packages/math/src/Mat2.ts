import type { Vec2 } from "./Vec2";

/**
 * A 2D affine transformation matrix represented as a tuple [a, b, c, d, tx, ty].
 *
 * This is a 2x3 matrix in the form:
 * | a  c  tx |
 * | b  d  ty |
 *
 * Where:
 * - a: scaleX (scales along x-axis, default 1)
 * - b: skewY (skews along y-axis)
 * - c: skewX (skews along x-axis)
 * - d: scaleY (scales along y-axis, default 1)
 * - tx: translateX (translates along x-axis)
 * - ty: translateY (translates along y-axis)
 *
 * This matches the CSS matrix() function: matrix(a, b, c, d, tx, ty)
 */
export type Mat2 = [number, number, number, number, number, number];

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Mat2 {
  // Indices for readability
  const A = 0;
  const B = 1;
  const C = 2;
  const D = 3;
  const TX = 4;
  const TY = 5;

  // Creation (these allocate by nature)

  export const create = (
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number
  ): Mat2 => [a, b, c, d, tx, ty];

  export const identity = (): Mat2 => [1, 0, 0, 1, 0, 0];

  export const clone = (m: Mat2): Mat2 => [
    m[A],
    m[B],
    m[C],
    m[D],
    m[TX],
    m[TY],
  ];

  /**
   * Create a translation matrix.
   */
  export const fromTranslation = (tx: number, ty: number): Mat2 => [
    1,
    0,
    0,
    1,
    tx,
    ty,
  ];

  /**
   * Create a scaling matrix.
   * If sy is not provided, uniform scaling is applied.
   */
  export const fromScale = (sx: number, sy?: number): Mat2 => [
    sx,
    0,
    0,
    sy ?? sx,
    0,
    0,
  ];

  /**
   * Create a rotation matrix.
   * @param angle - Rotation angle in radians.
   */
  export const fromRotation = (angle: number): Mat2 => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [cos, sin, -sin, cos, 0, 0];
  };

  /**
   * Create a skew matrix.
   * @param skewX - Skew angle along x-axis in radians.
   * @param skewY - Skew angle along y-axis in radians.
   */
  export const fromSkew = (skewX: number, skewY: number): Mat2 => [
    1,
    Math.tan(skewY),
    Math.tan(skewX),
    1,
    0,
    0,
  ];

  // Getters (non-mutating, return scalars)

  export const getTranslation = (m: Mat2): Vec2 => [m[TX], m[TY]];

  export const getScale = (m: Mat2): Vec2 => {
    const sx = Math.sqrt(m[A] * m[A] + m[B] * m[B]);
    const sy = Math.sqrt(m[C] * m[C] + m[D] * m[D]);
    return [sx, sy];
  };

  export const getRotation = (m: Mat2): number => Math.atan2(m[B], m[A]);

  /**
   * Calculate the determinant of the matrix.
   */
  export const determinant = (m: Mat2): number =>
    m[A] * m[D] - m[B] * m[C];

  // Operations (mutating) - modify first argument in-place, return void

  export const set = (
    out: Mat2,
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number
  ): void => {
    out[A] = a;
    out[B] = b;
    out[C] = c;
    out[D] = d;
    out[TX] = tx;
    out[TY] = ty;
  };

  export const copy = (out: Mat2, m: Mat2): void => {
    out[A] = m[A];
    out[B] = m[B];
    out[C] = m[C];
    out[D] = m[D];
    out[TX] = m[TX];
    out[TY] = m[TY];
  };

  export const setIdentity = (out: Mat2): void => {
    out[A] = 1;
    out[B] = 0;
    out[C] = 0;
    out[D] = 1;
    out[TX] = 0;
    out[TY] = 0;
  };

  /**
   * Multiply matrix by another matrix: out = out * m
   */
  export const multiply = (out: Mat2, m: Mat2): void => {
    const a = out[A] * m[A] + out[C] * m[B];
    const b = out[B] * m[A] + out[D] * m[B];
    const c = out[A] * m[C] + out[C] * m[D];
    const d = out[B] * m[C] + out[D] * m[D];
    const tx = out[A] * m[TX] + out[C] * m[TY] + out[TX];
    const ty = out[B] * m[TX] + out[D] * m[TY] + out[TY];
    out[A] = a;
    out[B] = b;
    out[C] = c;
    out[D] = d;
    out[TX] = tx;
    out[TY] = ty;
  };

  /**
   * Premultiply matrix by another matrix: out = m * out
   */
  export const premultiply = (out: Mat2, m: Mat2): void => {
    const a = m[A] * out[A] + m[C] * out[B];
    const b = m[B] * out[A] + m[D] * out[B];
    const c = m[A] * out[C] + m[C] * out[D];
    const d = m[B] * out[C] + m[D] * out[D];
    const tx = m[A] * out[TX] + m[C] * out[TY] + m[TX];
    const ty = m[B] * out[TX] + m[D] * out[TY] + m[TY];
    out[A] = a;
    out[B] = b;
    out[C] = c;
    out[D] = d;
    out[TX] = tx;
    out[TY] = ty;
  };

  /**
   * Invert the matrix in place.
   * Returns false if the matrix is not invertible (determinant is 0).
   */
  export const invert = (out: Mat2): boolean => {
    const det = determinant(out);
    if (det === 0) {
      return false;
    }
    const invDet = 1 / det;
    const a = out[D] * invDet;
    const b = -out[B] * invDet;
    const c = -out[C] * invDet;
    const d = out[A] * invDet;
    const tx = (out[C] * out[TY] - out[D] * out[TX]) * invDet;
    const ty = (out[B] * out[TX] - out[A] * out[TY]) * invDet;
    out[A] = a;
    out[B] = b;
    out[C] = c;
    out[D] = d;
    out[TX] = tx;
    out[TY] = ty;
    return true;
  };

  /**
   * Apply a translation to the matrix.
   */
  export const translate = (out: Mat2, tx: number, ty: number): void => {
    out[TX] += out[A] * tx + out[C] * ty;
    out[TY] += out[B] * tx + out[D] * ty;
  };

  /**
   * Apply a scale to the matrix.
   */
  export const scale = (out: Mat2, sx: number, sy?: number): void => {
    const scaleY = sy ?? sx;
    out[A] *= sx;
    out[B] *= sx;
    out[C] *= scaleY;
    out[D] *= scaleY;
  };

  /**
   * Apply a rotation to the matrix.
   * @param angle - Rotation angle in radians.
   */
  export const rotate = (out: Mat2, angle: number): void => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const a = out[A] * cos + out[C] * sin;
    const b = out[B] * cos + out[D] * sin;
    const c = out[A] * -sin + out[C] * cos;
    const d = out[B] * -sin + out[D] * cos;
    out[A] = a;
    out[B] = b;
    out[C] = c;
    out[D] = d;
  };

  /**
   * Apply a skew to the matrix.
   * @param skewX - Skew angle along x-axis in radians.
   * @param skewY - Skew angle along y-axis in radians.
   */
  export const skew = (out: Mat2, skewX: number, skewY: number): void => {
    const tanX = Math.tan(skewX);
    const tanY = Math.tan(skewY);
    const a = out[A] + out[C] * tanY;
    const b = out[B] + out[D] * tanY;
    const c = out[A] * tanX + out[C];
    const d = out[B] * tanX + out[D];
    out[A] = a;
    out[B] = b;
    out[C] = c;
    out[D] = d;
  };

  // Vec2 transformation

  /**
   * Transform a point by the matrix (applies full transform including translation).
   */
  export const transformPoint = (m: Mat2, out: Vec2): void => {
    const x = m[A] * out[0] + m[C] * out[1] + m[TX];
    const y = m[B] * out[0] + m[D] * out[1] + m[TY];
    out[0] = x;
    out[1] = y;
  };

  /**
   * Transform a vector by the matrix (applies rotation/scale only, no translation).
   */
  export const transformVector = (m: Mat2, out: Vec2): void => {
    const x = m[A] * out[0] + m[C] * out[1];
    const y = m[B] * out[0] + m[D] * out[1];
    out[0] = x;
    out[1] = y;
  };

  /**
   * Transform a point by the inverse of the matrix.
   * Returns false if the matrix is not invertible.
   */
  export const inverseTransformPoint = (
    m: Mat2,
    out: Vec2
  ): boolean => {
    const det = determinant(m);
    if (det === 0) {
      return false;
    }
    const invDet = 1 / det;
    const x = out[0] - m[TX];
    const y = out[1] - m[TY];
    out[0] = (m[D] * x - m[C] * y) * invDet;
    out[1] = (m[A] * y - m[B] * x) * invDet;
    return true;
  };

  // Utility

  /**
   * Check if two matrices are approximately equal.
   */
  export const equals = (a: Mat2, b: Mat2, epsilon = 1e-6): boolean =>
    Math.abs(a[A] - b[A]) < epsilon &&
    Math.abs(a[B] - b[B]) < epsilon &&
    Math.abs(a[C] - b[C]) < epsilon &&
    Math.abs(a[D] - b[D]) < epsilon &&
    Math.abs(a[TX] - b[TX]) < epsilon &&
    Math.abs(a[TY] - b[TY]) < epsilon;

  /**
   * Check if matrix is the identity matrix.
   */
  export const isIdentity = (m: Mat2, epsilon = 1e-6): boolean =>
    Math.abs(m[A] - 1) < epsilon &&
    Math.abs(m[B]) < epsilon &&
    Math.abs(m[C]) < epsilon &&
    Math.abs(m[D] - 1) < epsilon &&
    Math.abs(m[TX]) < epsilon &&
    Math.abs(m[TY]) < epsilon;

  /**
   * Convert to CSS matrix() string.
   */
  export const toCssMatrix = (m: Mat2): string =>
    `matrix(${m[A]}, ${m[B]}, ${m[C]}, ${m[D]}, ${m[TX]}, ${m[TY]})`;

  /**
   * Parse a CSS matrix() or matrix3d() string.
   * Returns null if parsing fails.
   */
  export const fromCssMatrix = (css: string): Mat2 | null => {
    const match = css.match(
      /matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/
    );
    if (!match) {
      return null;
    }
    const values = match.slice(1).map(Number);
    if (values.some(isNaN)) {
      return null;
    }
    return values as Mat2;
  };
}
