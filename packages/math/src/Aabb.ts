import type { Vec2 } from "./Vec2";

/**
 * An axis-aligned bounding box represented as a tuple [left, top, right, bottom].
 */
export type Aabb = [
  left: number,
  top: number,
  right: number,
  bottom: number
];

// Indices for tuple access
export const AABB_LEFT = 0;
export const AABB_TOP = 1;
export const AABB_RIGHT = 2;
export const AABB_BOTTOM = 3;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Aabb {
  // Creation (these allocate by nature)

  export const create = (
    left: number,
    top: number,
    right: number,
    bottom: number
  ): Aabb => [left, top, right, bottom];

  export const zero = (): Aabb => [0, 0, 0, 0];

  export const clone = (a: Aabb): Aabb => [a[0], a[1], a[2], a[3]];

  export const fromPoints = (points: Vec2[]): Aabb => {
    if (points.length === 0) return zero();

    let left = points[0][0];
    let top = points[0][1];
    let right = points[0][0];
    let bottom = points[0][1];

    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i];
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }

    return [left, top, right, bottom];
  };

  export const fromPositionSize = (
    left: number,
    top: number,
    width: number,
    height: number
  ): Aabb => [left, top, left + width, top + height];

  // Getters

  export const left = (a: Aabb): number => a[AABB_LEFT];
  export const top = (a: Aabb): number => a[AABB_TOP];
  export const right = (a: Aabb): number => a[AABB_RIGHT];
  export const bottom = (a: Aabb): number => a[AABB_BOTTOM];

  export const width = (a: Aabb): number => a[AABB_RIGHT] - a[AABB_LEFT];
  export const height = (a: Aabb): number => a[AABB_BOTTOM] - a[AABB_TOP];

  export const center = (a: Aabb): Vec2 => [
    (a[AABB_LEFT] + a[AABB_RIGHT]) / 2,
    (a[AABB_TOP] + a[AABB_BOTTOM]) / 2,
  ];

  export const size = (a: Aabb): Vec2 => [width(a), height(a)];

  export const corners = (a: Aabb): [Vec2, Vec2, Vec2, Vec2] => [
    [a[AABB_LEFT], a[AABB_TOP]],
    [a[AABB_RIGHT], a[AABB_TOP]],
    [a[AABB_RIGHT], a[AABB_BOTTOM]],
    [a[AABB_LEFT], a[AABB_BOTTOM]],
  ];

  // Tests

  export const containsPoint = (
    a: Aabb,
    point: Vec2,
    inclusive = true
  ): boolean =>
    inclusive
      ? point[0] >= a[AABB_LEFT] &&
        point[0] <= a[AABB_RIGHT] &&
        point[1] >= a[AABB_TOP] &&
        point[1] <= a[AABB_BOTTOM]
      : point[0] > a[AABB_LEFT] &&
        point[0] < a[AABB_RIGHT] &&
        point[1] > a[AABB_TOP] &&
        point[1] < a[AABB_BOTTOM];

  export const intersects = (a: Aabb, b: Aabb): boolean =>
    !(
      a[AABB_RIGHT] < b[AABB_LEFT] ||
      a[AABB_LEFT] > b[AABB_RIGHT] ||
      a[AABB_BOTTOM] < b[AABB_TOP] ||
      a[AABB_TOP] > b[AABB_BOTTOM]
    );

  export const contains = (outer: Aabb, inner: Aabb): boolean =>
    outer[AABB_LEFT] <= inner[AABB_LEFT] &&
    outer[AABB_TOP] <= inner[AABB_TOP] &&
    outer[AABB_RIGHT] >= inner[AABB_RIGHT] &&
    outer[AABB_BOTTOM] >= inner[AABB_BOTTOM];

  export const distanceToPoint = (a: Aabb, point: Vec2): number => {
    const dx = Math.max(a[AABB_LEFT] - point[0], 0, point[0] - a[AABB_RIGHT]);
    const dy = Math.max(a[AABB_TOP] - point[1], 0, point[1] - a[AABB_BOTTOM]);
    return Math.hypot(dx, dy);
  };

  // Operations (mutating) - modify first argument in-place, return void

  export const set = (
    out: Aabb,
    left: number,
    top: number,
    right: number,
    bottom: number
  ): void => {
    out[AABB_LEFT] = left;
    out[AABB_TOP] = top;
    out[AABB_RIGHT] = right;
    out[AABB_BOTTOM] = bottom;
  };

  export const copy = (out: Aabb, a: Aabb): void => {
    out[AABB_LEFT] = a[AABB_LEFT];
    out[AABB_TOP] = a[AABB_TOP];
    out[AABB_RIGHT] = a[AABB_RIGHT];
    out[AABB_BOTTOM] = a[AABB_BOTTOM];
  };

  export const expand = (out: Aabb, point: Vec2): void => {
    out[AABB_LEFT] = Math.min(out[AABB_LEFT], point[0]);
    out[AABB_TOP] = Math.min(out[AABB_TOP], point[1]);
    out[AABB_RIGHT] = Math.max(out[AABB_RIGHT], point[0]);
    out[AABB_BOTTOM] = Math.max(out[AABB_BOTTOM], point[1]);
  };

  export const union = (out: Aabb, b: Aabb): void => {
    out[AABB_LEFT] = Math.min(out[AABB_LEFT], b[AABB_LEFT]);
    out[AABB_TOP] = Math.min(out[AABB_TOP], b[AABB_TOP]);
    out[AABB_RIGHT] = Math.max(out[AABB_RIGHT], b[AABB_RIGHT]);
    out[AABB_BOTTOM] = Math.max(out[AABB_BOTTOM], b[AABB_BOTTOM]);
  };

  export const intersection = (out: Aabb, b: Aabb): void => {
    out[AABB_LEFT] = Math.max(out[AABB_LEFT], b[AABB_LEFT]);
    out[AABB_TOP] = Math.max(out[AABB_TOP], b[AABB_TOP]);
    out[AABB_RIGHT] = Math.min(out[AABB_RIGHT], b[AABB_RIGHT]);
    out[AABB_BOTTOM] = Math.min(out[AABB_BOTTOM], b[AABB_BOTTOM]);
  };

  export const pad = (out: Aabb, padding: number): void => {
    out[AABB_LEFT] -= padding;
    out[AABB_TOP] -= padding;
    out[AABB_RIGHT] += padding;
    out[AABB_BOTTOM] += padding;
  };

  export const setFromPoints = (out: Aabb, points: Vec2[]): void => {
    if (points.length === 0) {
      out[AABB_LEFT] = 0;
      out[AABB_TOP] = 0;
      out[AABB_RIGHT] = 0;
      out[AABB_BOTTOM] = 0;
      return;
    }

    out[AABB_LEFT] = points[0][0];
    out[AABB_TOP] = points[0][1];
    out[AABB_RIGHT] = points[0][0];
    out[AABB_BOTTOM] = points[0][1];

    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i];
      if (x < out[AABB_LEFT]) out[AABB_LEFT] = x;
      if (y < out[AABB_TOP]) out[AABB_TOP] = y;
      if (x > out[AABB_RIGHT]) out[AABB_RIGHT] = x;
      if (y > out[AABB_BOTTOM]) out[AABB_BOTTOM] = y;
    }
  };

  export const translate = (out: Aabb, delta: Vec2): void => {
    out[AABB_LEFT] += delta[0];
    out[AABB_TOP] += delta[1];
    out[AABB_RIGHT] += delta[0];
    out[AABB_BOTTOM] += delta[1];
  };

  export const scale = (out: Aabb, factor: number): void => {
    out[AABB_LEFT] *= factor;
    out[AABB_TOP] *= factor;
    out[AABB_RIGHT] *= factor;
    out[AABB_BOTTOM] *= factor;
  };
}
