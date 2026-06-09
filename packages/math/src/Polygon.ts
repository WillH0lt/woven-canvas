import type { Aabb } from './Aabb'
import { Capsule } from './Capsule'
import type { Vec2 } from './Vec2'

/**
 * A polygon represented as a flat array of vertex coordinates:
 * [x0, y0, x1, y1, x2, y2, ...]
 *
 * The polygon is implicitly closed — the last vertex connects back to the
 * first. Self-intersecting polygons are supported; containment uses the
 * even-odd fill rule, which matches SVG `fill-rule="evenodd"`.
 */
export type Polygon = number[]

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Polygon {
  /**
   * Test whether a point lies inside a polygon using the even-odd
   * (crossing-number) fill rule. A horizontal ray is cast from the point and
   * the number of edge crossings counted; an odd count means inside.
   *
   * This reproduces SVG `fill-rule="evenodd"`: for self-overlapping shapes
   * (e.g. a spiral), regions overlapped an even number of times count as
   * outside — exactly the regions that render empty.
   *
   * @param points - Flat vertex array [x0, y0, x1, y1, ...]
   * @param count - Number of vertices (points.length is 2 * count)
   * @param point - Point to test [x, y]
   */
  export const containsPointEvenOdd = (points: ArrayLike<number>, count: number, point: Vec2): boolean =>
    containsXY(points, count, point[0], point[1])

  /**
   * Allocation-free even-odd containment test taking raw coordinates.
   * @see containsPointEvenOdd
   */
  export const containsXY = (points: ArrayLike<number>, count: number, px: number, py: number): boolean => {
    if (count < 3) return false

    let inside = false

    let j = count - 1
    for (let i = 0; i < count; i++) {
      const xi = points[i * 2]
      const yi = points[i * 2 + 1]
      const xj = points[j * 2]
      const yj = points[j * 2 + 1]

      // Does the edge straddle the horizontal ray at py?
      if (yi > py !== yj > py) {
        // X coordinate where the edge crosses the ray.
        const xCross = ((xj - xi) * (py - yi)) / (yj - yi) + xi
        if (px < xCross) inside = !inside
      }

      j = i
    }

    return inside
  }

  /**
   * Test whether a capsule (thick line segment) overlaps the filled polygon
   * region (even-odd rule). Used by the eraser, which sweeps the scene with a
   * capsule.
   *
   * Intersects when either capsule endpoint lies inside the filled region, or
   * the capsule's tube comes within its radius of any polygon edge. Together
   * these cover a capsule deep inside the fill, crossing the boundary, or
   * grazing an edge. Allocation-free.
   *
   * @param points - Flat vertex array [x0, y0, x1, y1, ...]
   * @param count - Number of vertices
   * @param capsule - Capsule [ax, ay, bx, by, radius] in the same space as the polygon
   */
  export const intersectsCapsule = (points: ArrayLike<number>, count: number, capsule: Capsule): boolean => {
    if (count < 3) return false

    const ax = capsule[0]
    const ay = capsule[1]
    const bx = capsule[2]
    const by = capsule[3]
    const radius = capsule[4]

    // Either endpoint inside the filled region (capsule sits within the fill).
    if (containsXY(points, count, ax, ay)) return true
    if (containsXY(points, count, bx, by)) return true

    // Capsule tube within radius of any edge (boundary crossing or grazing).
    let j = count - 1
    for (let i = 0; i < count; i++) {
      const dist = Capsule.segmentToSegmentDistance(
        ax,
        ay,
        bx,
        by,
        points[j * 2],
        points[j * 2 + 1],
        points[i * 2],
        points[i * 2 + 1],
      )
      if (dist <= radius) return true
      j = i
    }

    return false
  }

  /**
   * Test whether a line segment intersects an axis-aligned bounding box.
   * Uses Liang–Barsky clipping. Allocation-free.
   */
  export const segmentIntersectsAabb = (x0: number, y0: number, x1: number, y1: number, aabb: Aabb): boolean => {
    const dx = x1 - x0
    const dy = y1 - y0
    let t0 = 0
    let t1 = 1

    // Clip against each of the 4 box edges: p is the direction component,
    // q is the signed distance from the segment start to that edge.
    // left
    let p = -dx
    let q = x0 - aabb[0]
    if (p === 0) {
      if (q < 0) return false
    } else {
      const r = q / p
      if (p < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
    }
    // right
    p = dx
    q = aabb[2] - x0
    if (p === 0) {
      if (q < 0) return false
    } else {
      const r = q / p
      if (p < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
    }
    // top
    p = -dy
    q = y0 - aabb[1]
    if (p === 0) {
      if (q < 0) return false
    } else {
      const r = q / p
      if (p < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
    }
    // bottom
    p = dy
    q = aabb[3] - y0
    if (p === 0) {
      if (q < 0) return false
    } else {
      const r = q / p
      if (p < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
    }

    return t0 <= t1
  }

  /**
   * Coarse test for whether a polygon overlaps an axis-aligned bounding box.
   * Used for box queries (eraser sweeps, marquee selection).
   *
   * Returns true when:
   * - any polygon vertex is inside the box (polygon overlaps or is contained), or
   * - the box is fully inside the polygon (a box corner is inside, even-odd), or
   * - any polygon edge crosses the box boundary.
   *
   * Note: this treats the polygon as filled per the even-odd rule for the
   * containment case but does not account for even-odd holes when the box sits
   * entirely within a hole — acceptable for selection/erase use.
   *
   * @param points - Flat vertex array [x0, y0, x1, y1, ...]
   * @param count - Number of vertices
   * @param aabb - Box to test [left, top, right, bottom]
   */
  export const intersectsAabb = (points: ArrayLike<number>, count: number, aabb: Aabb): boolean => {
    if (count < 3) return false

    // 1. Any vertex inside the box?
    for (let i = 0; i < count; i++) {
      const x = points[i * 2]
      const y = points[i * 2 + 1]
      if (x >= aabb[0] && x <= aabb[2] && y >= aabb[1] && y <= aabb[3]) return true
    }

    // 2. Box fully inside the polygon? Test one corner with even-odd.
    if (containsXY(points, count, aabb[0], aabb[1])) return true

    // 3. Any edge crossing the box boundary?
    let j = count - 1
    for (let i = 0; i < count; i++) {
      if (segmentIntersectsAabb(points[j * 2], points[j * 2 + 1], points[i * 2], points[i * 2 + 1], aabb)) {
        return true
      }
      j = i
    }

    return false
  }
}
