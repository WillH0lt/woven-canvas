import { Vec2 } from "./Vec2";
import { Aabb } from "./Aabb";

/**
 * A capsule (stadium shape) represented as two endpoints and a radius.
 * The capsule is the Minkowski sum of a line segment and a circle.
 * Useful for swept collision detection (e.g., eraser strokes).
 *
 * Tuple format: [ax, ay, bx, by, radius]
 */
export type Capsule = [
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number
];

// Indices for tuple access
export const CAPSULE_AX = 0;
export const CAPSULE_AY = 1;
export const CAPSULE_BX = 2;
export const CAPSULE_BY = 3;
export const CAPSULE_RADIUS = 4;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Capsule {
  // Creation

  export const create = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number
  ): Capsule => [ax, ay, bx, by, radius];

  export const fromPoints = (a: Vec2, b: Vec2, radius: number): Capsule =>
    [a[0], a[1], b[0], b[1], radius];

  export const clone = (c: Capsule): Capsule => [
    c[0],
    c[1],
    c[2],
    c[3],
    c[4],
  ];

  // Getters

  export const pointA = (c: Capsule): Vec2 => [c[CAPSULE_AX], c[CAPSULE_AY]];
  export const pointB = (c: Capsule): Vec2 => [c[CAPSULE_BX], c[CAPSULE_BY]];
  export const radius = (c: Capsule): number => c[CAPSULE_RADIUS];

  export const center = (c: Capsule): Vec2 => [
    (c[CAPSULE_AX] + c[CAPSULE_BX]) / 2,
    (c[CAPSULE_AY] + c[CAPSULE_BY]) / 2,
  ];

  export const length = (c: Capsule): number => {
    const dx = c[CAPSULE_BX] - c[CAPSULE_AX];
    const dy = c[CAPSULE_BY] - c[CAPSULE_AY];
    return Math.hypot(dx, dy);
  };

  /**
   * Get the axis-aligned bounding box of the capsule.
   */
  export const bounds = (c: Capsule): Aabb => {
    const r = c[CAPSULE_RADIUS];
    return [
      Math.min(c[CAPSULE_AX], c[CAPSULE_BX]) - r,
      Math.min(c[CAPSULE_AY], c[CAPSULE_BY]) - r,
      Math.max(c[CAPSULE_AX], c[CAPSULE_BX]) + r,
      Math.max(c[CAPSULE_AY], c[CAPSULE_BY]) + r,
    ];
  };

  /**
   * Get extrema points of the capsule for AABB computation.
   * Returns the corners of the bounding box around each endpoint circle.
   */
  export const getExtrema = (c: Capsule): Vec2[] => {
    const ax = c[CAPSULE_AX];
    const ay = c[CAPSULE_AY];
    const bx = c[CAPSULE_BX];
    const by = c[CAPSULE_BY];
    const r = c[CAPSULE_RADIUS];

    return [
      [ax - r, ay - r],
      [ax - r, ay + r],
      [ax + r, ay - r],
      [ax + r, ay + r],
      [bx - r, by - r],
      [bx - r, by + r],
      [bx + r, by - r],
      [bx + r, by + r],
    ];
  };

  // Collision detection

  /**
   * Find the closest point on a line segment to a given point.
   * Returns the parameter t (0 to 1) along the segment.
   */
  export const closestPointOnSegmentParam = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    px: number,
    py: number
  ): number => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return 0;

    const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    return Math.max(0, Math.min(1, t));
  };

  /**
   * Get the closest point on the capsule's center line to a given point.
   */
  export const closestPointOnCenterLine = (
    c: Capsule,
    point: Vec2
  ): Vec2 => {
    const t = closestPointOnSegmentParam(
      c[CAPSULE_AX],
      c[CAPSULE_AY],
      c[CAPSULE_BX],
      c[CAPSULE_BY],
      point[0],
      point[1]
    );
    return [
      c[CAPSULE_AX] + t * (c[CAPSULE_BX] - c[CAPSULE_AX]),
      c[CAPSULE_AY] + t * (c[CAPSULE_BY] - c[CAPSULE_AY]),
    ];
  };

  /**
   * Get the distance from a point to the capsule's center line.
   */
  export const distanceToPoint = (c: Capsule, point: Vec2): number => {
    const closest = closestPointOnCenterLine(c, point);
    return Vec2.distance(closest, point);
  };

  /**
   * Check if a point is inside the capsule (within radius of center line).
   */
  export const containsPoint = (c: Capsule, point: Vec2): boolean => {
    return distanceToPoint(c, point) <= c[CAPSULE_RADIUS];
  };

  /**
   * Check if the capsule intersects an axis-aligned bounding box.
   * Uses separating axis theorem with the capsule approximated as an OBB + end caps.
   */
  export const intersectsAabb = (c: Capsule, aabb: Aabb): boolean => {
    const r = c[CAPSULE_RADIUS];

    // First do a quick AABB vs AABB check using capsule bounds
    const capsuleBounds = bounds(c);
    if (!Aabb.intersects(capsuleBounds, aabb)) {
      return false;
    }

    // Find the closest point on the AABB to the capsule's center line
    // by clamping the closest point on the segment to the AABB

    // Get segment direction
    const dx = c[CAPSULE_BX] - c[CAPSULE_AX];
    const dy = c[CAPSULE_BY] - c[CAPSULE_AY];
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // Degenerate capsule (point + radius = circle)
      return Aabb.distanceToPoint(aabb, [c[CAPSULE_AX], c[CAPSULE_AY]]) <= r;
    }

    // Find the closest point on the segment to the AABB center, then check distance
    // Actually, we need to find the minimum distance from segment to AABB

    // Check each edge of the AABB against the capsule
    const aabbLeft = aabb[0];
    const aabbTop = aabb[1];
    const aabbRight = aabb[2];
    const aabbBottom = aabb[3];

    // Sample points on the segment and check if any are within r of the AABB
    // This is an approximation but works well for eraser use case
    const steps = Math.max(1, Math.ceil(Math.sqrt(lenSq) / r));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = c[CAPSULE_AX] + t * dx;
      const py = c[CAPSULE_AY] + t * dy;

      // Distance from this point to the AABB
      const dist = Aabb.distanceToPoint(aabb, [px, py]);
      if (dist <= r) {
        return true;
      }
    }

    return false;
  };

  /**
   * Check if two capsules intersect.
   */
  export const intersectsCapsule = (
    c1: Capsule,
    c2: Capsule
  ): boolean => {
    // Two capsules intersect if the distance between their center lines
    // is less than the sum of their radii

    const minDist = segmentToSegmentDistance(
      c1[CAPSULE_AX],
      c1[CAPSULE_AY],
      c1[CAPSULE_BX],
      c1[CAPSULE_BY],
      c2[CAPSULE_AX],
      c2[CAPSULE_AY],
      c2[CAPSULE_BX],
      c2[CAPSULE_BY]
    );

    return minDist <= c1[CAPSULE_RADIUS] + c2[CAPSULE_RADIUS];
  };

  /**
   * Calculate the minimum distance between two line segments.
   */
  export const segmentToSegmentDistance = (
    a1x: number,
    a1y: number,
    b1x: number,
    b1y: number,
    a2x: number,
    a2y: number,
    b2x: number,
    b2y: number
  ): number => {
    // Direction vectors
    const d1x = b1x - a1x;
    const d1y = b1y - a1y;
    const d2x = b2x - a2x;
    const d2y = b2y - a2y;

    // Vector from start of segment 1 to start of segment 2
    const rx = a1x - a2x;
    const ry = a1y - a2y;

    const a = d1x * d1x + d1y * d1y; // Length squared of segment 1
    const b = d1x * d2x + d1y * d2y; // Dot product of directions
    const c = d2x * d2x + d2y * d2y; // Length squared of segment 2
    const d = d1x * rx + d1y * ry;
    const e = d2x * rx + d2y * ry;

    const denom = a * c - b * b;

    let s: number;
    let t: number;

    if (denom < 1e-10) {
      // Segments are nearly parallel
      s = 0;
      t = e / c;
    } else {
      s = (b * e - c * d) / denom;
      t = (a * e - b * d) / denom;
    }

    // Clamp to segment bounds
    s = Math.max(0, Math.min(1, s));
    t = Math.max(0, Math.min(1, t));

    // Recompute the other parameter based on clamped value
    if (s < 0 || s > 1) {
      t = (b * s + e) / c;
      t = Math.max(0, Math.min(1, t));
      s = (b * t - d) / a;
      s = Math.max(0, Math.min(1, s));
    }

    // Get closest points
    const p1x = a1x + s * d1x;
    const p1y = a1y + s * d1y;
    const p2x = a2x + t * d2x;
    const p2y = a2y + t * d2y;

    return Math.hypot(p2x - p1x, p2y - p1y);
  };

  // Operations (mutating)

  export const set = (
    out: Capsule,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number
  ): void => {
    out[CAPSULE_AX] = ax;
    out[CAPSULE_AY] = ay;
    out[CAPSULE_BX] = bx;
    out[CAPSULE_BY] = by;
    out[CAPSULE_RADIUS] = radius;
  };

  export const copy = (out: Capsule, c: Capsule): void => {
    out[CAPSULE_AX] = c[CAPSULE_AX];
    out[CAPSULE_AY] = c[CAPSULE_AY];
    out[CAPSULE_BX] = c[CAPSULE_BX];
    out[CAPSULE_BY] = c[CAPSULE_BY];
    out[CAPSULE_RADIUS] = c[CAPSULE_RADIUS];
  };

  export const translate = (out: Capsule, delta: Vec2): void => {
    out[CAPSULE_AX] += delta[0];
    out[CAPSULE_AY] += delta[1];
    out[CAPSULE_BX] += delta[0];
    out[CAPSULE_BY] += delta[1];
  };

  /**
   * Trim the capsule to a portion between two parametric values (0 to 1).
   * Modifies the capsule in place.
   * @param out - The capsule to trim
   * @param tStart - Start parameter (0 = point A, 1 = point B)
   * @param tEnd - End parameter (0 = point A, 1 = point B)
   */
  export const trim = (
    out: Capsule,
    tStart: number,
    tEnd: number
  ): void => {
    const ax = out[CAPSULE_AX];
    const ay = out[CAPSULE_AY];
    const bx = out[CAPSULE_BX];
    const by = out[CAPSULE_BY];

    const dx = bx - ax;
    const dy = by - ay;

    // Calculate new endpoints based on parametric values
    out[CAPSULE_AX] = ax + tStart * dx;
    out[CAPSULE_AY] = ay + tStart * dy;
    out[CAPSULE_BX] = ax + tEnd * dx;
    out[CAPSULE_BY] = ay + tEnd * dy;
  };
}
