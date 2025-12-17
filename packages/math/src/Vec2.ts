/**
 * A 2D vector represented as a tuple [x, y].
 */
export type Vec2 = [number, number];

// Creation

export const vec2 = (x: number, y: number): Vec2 => [x, y];

export const vec2Zero = (): Vec2 => [0, 0];

// Basic Operations

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];

export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];

export const scale = (v: Vec2, s: number): Vec2 => [v[0] * s, v[1] * s];

export const negate = (v: Vec2): Vec2 => [-v[0], -v[1]];

// Geometric

export const dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];

export const lengthSq = (v: Vec2): number => v[0] * v[0] + v[1] * v[1];

export const length = (v: Vec2): number => Math.hypot(v[0], v[1]);

export const distance = (a: Vec2, b: Vec2): number => length(sub(b, a));

export const distanceSq = (a: Vec2, b: Vec2): number => lengthSq(sub(b, a));

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  return len > 0 ? scale(v, 1 / len) : vec2Zero();
};
