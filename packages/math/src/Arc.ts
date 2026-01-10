import type { Vec2 } from "./Vec2";
import type { Aabb } from "./Aabb";

/**
 * An arc (curved line through 3 points with thickness) represented as a tuple:
 * [aX, aY, bX, bY, cX, cY, thickness]
 *
 * - a (indices 0-1): Start point
 * - b (indices 2-3): Control point (determines the curve direction)
 * - c (indices 4-5): End point
 * - thickness (index 6): Line thickness
 */
export type ArcTuple = [
  aX: number,
  aY: number,
  bX: number,
  bY: number,
  cX: number,
  cY: number,
  thickness: number
];

// Indices for tuple access
export const AX = 0;
export const AY = 1;
export const BX = 2;
export const BY = 3;
export const CX = 4;
export const CY = 5;
export const THICKNESS = 6;

/**
 * Computed arc properties (derived from the 3 points).
 * Used for intersection tests and other geometric operations.
 */
export interface ArcComputed {
  center: Vec2;
  radius: number;
  clockwise: boolean;
  arcAngle: number;
  startAngle: number;
  endAngle: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Arc {
  // Creation

  export const create = (
    aX: number,
    aY: number,
    bX: number,
    bY: number,
    cX: number,
    cY: number,
    thickness: number
  ): ArcTuple => [aX, aY, bX, bY, cX, cY, thickness];

  export const zero = (): ArcTuple => [0, 0, 0, 0, 0, 0, 0];

  export const clone = (arc: ArcTuple): ArcTuple => [
    arc[0],
    arc[1],
    arc[2],
    arc[3],
    arc[4],
    arc[5],
    arc[6],
  ];

  // Getters

  export const a = (arc: ArcTuple): Vec2 => [arc[AX], arc[AY]];
  export const b = (arc: ArcTuple): Vec2 => [arc[BX], arc[BY]];
  export const c = (arc: ArcTuple): Vec2 => [arc[CX], arc[CY]];
  export const thickness = (arc: ArcTuple): number => arc[THICKNESS];

  // Computed properties

  /**
   * Check if three points are collinear (no valid circle can be formed).
   */
  export const isCollinear = (arc: ArcTuple): boolean => {
    const det =
      (arc[AX] - arc[CX]) * (arc[BY] - arc[CY]) -
      (arc[BX] - arc[CX]) * (arc[AY] - arc[CY]);
    return Math.abs(det) < 1e-8;
  };

  /**
   * Compute the center of the circle passing through points a, b, c.
   * Returns null if points are collinear.
   */
  export const computeCenter = (arc: ArcTuple): Vec2 | null => {
    const x1 = arc[AX],
      y1 = arc[AY];
    const x2 = arc[BX],
      y2 = arc[BY];
    const x3 = arc[CX],
      y3 = arc[CY];

    const det = (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    if (Math.abs(det) < 1e-10) return null;

    const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    if (Math.abs(d) < 1e-10) return null;

    const ux =
      ((x1 * x1 + y1 * y1) * (y2 - y3) +
        (x2 * x2 + y2 * y2) * (y3 - y1) +
        (x3 * x3 + y3 * y3) * (y1 - y2)) /
      d;
    const uy =
      ((x1 * x1 + y1 * y1) * (x3 - x2) +
        (x2 * x2 + y2 * y2) * (x1 - x3) +
        (x3 * x3 + y3 * y3) * (x2 - x1)) /
      d;

    return [ux, uy];
  };

  /**
   * Compute all derived properties of an arc.
   * Returns null if points are collinear.
   */
  export const compute = (arc: ArcTuple): ArcComputed | null => {
    const center = computeCenter(arc);
    if (!center) return null;

    const ax = arc[AX],
      ay = arc[AY];
    const bx = arc[BX],
      by = arc[BY];
    const cx = arc[CX],
      cy = arc[CY];

    const radius = Math.hypot(bx - center[0], by - center[1]);

    // Clockwise if b is above the line from a to c
    const clockwise = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) < 0;

    const arcAngle = computeArcAngle(arc, center);
    let startAngle = Math.atan2(ay - center[1], ax - center[0]);
    startAngle = normalizeAngle(startAngle);
    let endAngle = startAngle + arcAngle * (clockwise ? -1 : 1);
    endAngle = normalizeAngle(endAngle);

    return { center, radius, clockwise, arcAngle, startAngle, endAngle };
  };

  /**
   * Check if an angle is within the arc's angular range.
   */
  export const inArcAngle = (
    angle: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean
  ): boolean => {
    angle = normalizeAngle(angle);

    if (clockwise) {
      if (startAngle < endAngle) {
        return angle >= endAngle || angle <= startAngle;
      }
      return angle >= endAngle && angle <= startAngle;
    }

    if (startAngle > endAngle) {
      return angle >= startAngle || angle <= endAngle;
    }

    return angle >= startAngle && angle <= endAngle;
  };

  /**
   * Check if a point lies on the arc (within thickness).
   */
  export const containsPoint = (arc: ArcTuple, point: Vec2): boolean => {
    const computed = compute(arc);
    if (!computed) return false;

    const { center, radius, startAngle, endAngle, clockwise } = computed;
    const halfThickness = arc[THICKNESS] / 2;

    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    const dist = Math.hypot(dx, dy);

    const distToArc = Math.abs(dist - radius);
    if (distToArc > halfThickness) return false;

    const angle = Math.atan2(dy, dx);
    return inArcAngle(angle, startAngle, endAngle, clockwise);
  };

  /**
   * Check if the arc intersects an AABB.
   */
  export const intersectsAabb = (arc: ArcTuple, aabb: Aabb): boolean => {
    const computed = compute(arc);
    if (!computed) return false;

    const { center, radius, startAngle, endAngle, clockwise } = computed;
    const halfThickness = arc[THICKNESS] / 2;

    // Check if arc endpoints are inside the AABB
    const arcA = a(arc);
    const arcB = b(arc);
    const arcC = c(arc);

    if (aabbContainsPoint(aabb, arcA)) return true;
    if (aabbContainsPoint(aabb, arcB)) return true;
    if (aabbContainsPoint(aabb, arcC)) return true;

    const innerRadius = radius - halfThickness;
    const outerRadius = radius + halfThickness;

    // Quick check if the circle has a chance of intersecting the AABB
    if (!circleIntersectsAabb(center, outerRadius, aabb)) return false;

    // Check if segments of the aabb intersect the arc
    const corners: Vec2[] = [
      [aabb[0], aabb[1]], // left, top
      [aabb[2], aabb[1]], // right, top
      [aabb[2], aabb[3]], // right, bottom
      [aabb[0], aabb[3]], // left, bottom
    ];

    for (const testRadius of [outerRadius, innerRadius]) {
      for (let i = 0; i < corners.length; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % corners.length];
        const points = segmentCircleIntersections(p1, p2, center, testRadius);

        for (const pt of points) {
          const angle = Math.atan2(pt[1] - center[1], pt[0] - center[0]);
          if (inArcAngle(angle, startAngle, endAngle, clockwise)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  /**
   * Check if the arc intersects a capsule (line segment with radius).
   */
  export const intersectsCapsule = (
    arc: ArcTuple,
    capsuleA: Vec2,
    capsuleB: Vec2,
    capsuleRadius: number
  ): boolean => {
    const computed = compute(arc);
    if (!computed) return false;

    const { center, radius, startAngle, endAngle, clockwise } = computed;
    const halfThickness = arc[THICKNESS] / 2;
    const innerRadius = radius - halfThickness;
    const outerRadius = radius + halfThickness;

    for (const testRadius of [outerRadius, innerRadius]) {
      const aInCircle = circleContainsPoint(center, testRadius, capsuleA);
      const bInCircle = circleContainsPoint(center, testRadius, capsuleB);
      if (aInCircle !== bInCircle) {
        const angle = Math.atan2(
          capsuleA[1] - center[1],
          capsuleA[0] - center[0]
        );
        if (inArcAngle(angle, startAngle, endAngle, clockwise)) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Find intersection points between the arc and a line segment.
   */
  export const intersectSegment = (
    arc: ArcTuple,
    p1: Vec2,
    p2: Vec2
  ): Vec2[] => {
    const computed = compute(arc);
    if (!computed) return [];

    const { center, radius, startAngle, endAngle, clockwise } = computed;
    const intersections = segmentCircleIntersections(p1, p2, center, radius);

    return intersections.filter((pt) => {
      const angle = Math.atan2(pt[1] - center[1], pt[0] - center[0]);
      return inArcAngle(angle, startAngle, endAngle, clockwise);
    });
  };

  /**
   * Convert a point on the arc to a parametric value (0 = start, 1 = end).
   * Returns null if the point is not on the arc.
   */
  export const pointToParametric = (arc: ArcTuple, point: Vec2): number | null => {
    const computed = compute(arc);
    if (!computed) return null;

    const { center, startAngle, arcAngle, clockwise } = computed;

    let angle = Math.atan2(point[1] - center[1], point[0] - center[0]);
    angle = normalizeAngle(angle);

    if (
      !inArcAngle(angle, computed.startAngle, computed.endAngle, clockwise)
    ) {
      return null;
    }

    let deltaAngle = (angle - startAngle) * (clockwise ? -1 : 1);
    if (deltaAngle < 0) {
      deltaAngle += 2 * Math.PI;
    }

    return deltaAngle / arcAngle;
  };

  /**
   * Convert a parametric value to a point on the arc.
   */
  export const parametricToPoint = (arc: ArcTuple, t: number): Vec2 => {
    const computed = compute(arc);
    if (!computed) {
      // Fallback to linear interpolation for collinear points
      return [
        arc[AX] + t * (arc[CX] - arc[AX]),
        arc[AY] + t * (arc[CY] - arc[AY]),
      ];
    }

    const { center, radius, startAngle, arcAngle, clockwise } = computed;
    const angle = startAngle + t * arcAngle * (clockwise ? -1 : 1);

    return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
  };

  /**
   * Get the arc length.
   */
  export const length = (arc: ArcTuple): number => {
    const computed = compute(arc);
    if (!computed) {
      // Fallback to straight-line distance for collinear points
      return Math.hypot(arc[CX] - arc[AX], arc[CY] - arc[AY]);
    }
    return computed.arcAngle * computed.radius;
  };

  /**
   * Get the tangent direction at a parametric position on the arc.
   */
  export const directionAt = (arc: ArcTuple, t: number): Vec2 => {
    const computed = compute(arc);
    if (!computed) {
      // Fallback to line direction for collinear points
      const dx = arc[CX] - arc[AX];
      const dy = arc[CY] - arc[AY];
      const len = Math.hypot(dx, dy);
      return len > 0 ? [dx / len, dy / len] : [0, 0];
    }

    const point = parametricToPoint(arc, t);
    const { center, clockwise } = computed;

    const tangent: Vec2 = [point[0] - center[0], point[1] - center[1]];
    const len = Math.hypot(tangent[0], tangent[1]);
    if (len === 0) return [0, 0];

    // Rotate 90 degrees to get direction
    if (clockwise) {
      return [tangent[1] / len, -tangent[0] / len];
    }
    return [-tangent[1] / len, tangent[0] / len];
  };

  /**
   * Get extrema points of the arc (endpoints plus any cardinal direction points).
   */
  export const extremaPoints = (arc: ArcTuple, rotation = 0): Vec2[] => {
    const computed = compute(arc);
    const points: Vec2[] = [a(arc), c(arc)];

    if (!computed) return points;

    const { center, radius, startAngle, endAngle, clockwise } = computed;

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + rotation;
      if (inArcAngle(angle, startAngle, endAngle, clockwise)) {
        points.push([
          center[0] + Math.cos(angle) * radius,
          center[1] + Math.sin(angle) * radius,
        ]);
      }
    }

    return points;
  };

  // Operations (mutating)

  export const set = (
    out: ArcTuple,
    aX: number,
    aY: number,
    bX: number,
    bY: number,
    cX: number,
    cY: number,
    thickness: number
  ): void => {
    out[AX] = aX;
    out[AY] = aY;
    out[BX] = bX;
    out[BY] = bY;
    out[CX] = cX;
    out[CY] = cY;
    out[THICKNESS] = thickness;
  };

  export const copy = (out: ArcTuple, arc: ArcTuple): void => {
    out[0] = arc[0];
    out[1] = arc[1];
    out[2] = arc[2];
    out[3] = arc[3];
    out[4] = arc[4];
    out[5] = arc[5];
    out[6] = arc[6];
  };

  export const setA = (out: ArcTuple, x: number, y: number): void => {
    out[AX] = x;
    out[AY] = y;
  };

  export const setB = (out: ArcTuple, x: number, y: number): void => {
    out[BX] = x;
    out[BY] = y;
  };

  export const setC = (out: ArcTuple, x: number, y: number): void => {
    out[CX] = x;
    out[CY] = y;
  };

  export const setThickness = (out: ArcTuple, value: number): void => {
    out[THICKNESS] = value;
  };

  /**
   * Set arc from three Vec2 points and thickness.
   */
  export const setFromPoints = (
    out: ArcTuple,
    a: Vec2,
    b: Vec2,
    c: Vec2,
    thickness: number
  ): void => {
    out[AX] = a[0];
    out[AY] = a[1];
    out[BX] = b[0];
    out[BY] = b[1];
    out[CX] = c[0];
    out[CY] = c[1];
    out[THICKNESS] = thickness;
  };

  /**
   * Trim the arc to a portion between two parametric values.
   */
  export const trim = (out: ArcTuple, tStart: number, tEnd: number): void => {
    const newA = parametricToPoint(out, tStart);
    const newB = parametricToPoint(out, (tStart + tEnd) / 2);
    const newC = parametricToPoint(out, tEnd);
    const t = out[THICKNESS];

    out[AX] = newA[0];
    out[AY] = newA[1];
    out[BX] = newB[0];
    out[BY] = newB[1];
    out[CX] = newC[0];
    out[CY] = newC[1];
    out[THICKNESS] = t;
  };
}

// Helper functions

function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

function computeArcAngle(arc: ArcTuple, center: Vec2): number {
  const ax = arc[AX],
    ay = arc[AY];
  const bx = arc[BX],
    by = arc[BY];
  const cx = arc[CX],
    cy = arc[CY];

  const angleA = normalizeAngle(Math.atan2(ay - center[1], ax - center[0]));
  const angleB = normalizeAngle(Math.atan2(by - center[1], bx - center[0]));
  const angleC = normalizeAngle(Math.atan2(cy - center[1], cx - center[0]));

  let shortArcFromAtoC = Math.abs(angleC - angleA);
  if (shortArcFromAtoC > Math.PI) {
    shortArcFromAtoC = 2 * Math.PI - shortArcFromAtoC;
  }

  const minAngle = Math.min(angleA, angleC);
  const maxAngle = Math.max(angleA, angleC);

  let bOnShorterArc: boolean;
  if (maxAngle - minAngle > Math.PI) {
    bOnShorterArc = angleB >= maxAngle || angleB <= minAngle;
  } else {
    bOnShorterArc = angleB >= minAngle && angleB <= maxAngle;
  }

  return bOnShorterArc ? shortArcFromAtoC : 2 * Math.PI - shortArcFromAtoC;
}

function aabbContainsPoint(aabb: Aabb, point: Vec2): boolean {
  return (
    point[0] >= aabb[0] &&
    point[0] <= aabb[2] &&
    point[1] >= aabb[1] &&
    point[1] <= aabb[3]
  );
}

function circleContainsPoint(
  center: Vec2,
  radius: number,
  point: Vec2
): boolean {
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  return dx * dx + dy * dy <= radius * radius;
}

function circleIntersectsAabb(center: Vec2, radius: number, aabb: Aabb): boolean {
  const closestX = Math.max(aabb[0], Math.min(center[0], aabb[2]));
  const closestY = Math.max(aabb[1], Math.min(center[1], aabb[3]));
  const dx = center[0] - closestX;
  const dy = center[1] - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function segmentCircleIntersections(
  p1: Vec2,
  p2: Vec2,
  center: Vec2,
  r: number
): Vec2[] {
  const d: Vec2 = [p2[0] - p1[0], p2[1] - p1[1]];
  const f: Vec2 = [p1[0] - center[0], p1[1] - center[1]];

  const a = d[0] * d[0] + d[1] * d[1];
  const b = 2 * (f[0] * d[0] + f[1] * d[1]);
  const c = f[0] * f[0] + f[1] * f[1] - r * r;

  // Degenerate segment (p1 == p2)
  if (a === 0) {
    const distSq = f[0] * f[0] + f[1] * f[1];
    if (Math.abs(distSq - r * r) <= 1e-12) {
      return [[p1[0], p1[1]]];
    }
    return [];
  }

  let disc = b * b - 4 * a * c;
  const EPS = 1e-12;
  if (disc < -EPS) return [];

  disc = Math.sqrt(Math.max(0, disc));
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);

  const points: Vec2[] = [];
  if (t1 >= 0 && t1 <= 1) {
    points.push([p1[0] + t1 * d[0], p1[1] + t1 * d[1]]);
  }
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > EPS) {
    points.push([p1[0] + t2 * d[0], p1[1] + t2 * d[1]]);
  }

  return points;
}

// Re-export type with same name for convenience
export type Arc = ArcTuple;
