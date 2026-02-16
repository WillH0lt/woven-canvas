import type { Aabb } from './Aabb'
import { Rect } from './Rect'
import type { Vec2 } from './Vec2'

/**
 * A 2D ray represented as a tuple [originX, originY, directionX, directionY].
 */
export type Ray = [originX: number, originY: number, directionX: number, directionY: number]

// Indices for tuple access
export const ORIGIN_X = 0
export const ORIGIN_Y = 1
export const DIR_X = 2
export const DIR_Y = 3

/**
 * Intersection result from ray operations.
 */
export interface RayIntersection {
  point: Vec2
  distance: number
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Ray {
  // Creation

  export const create = (originX: number, originY: number, directionX: number, directionY: number): Ray => [
    originX,
    originY,
    directionX,
    directionY,
  ]

  export const fromPoints = (origin: Vec2, direction: Vec2): Ray => [origin[0], origin[1], direction[0], direction[1]]

  export const zero = (): Ray => [0, 0, 0, 0]

  export const clone = (ray: Ray): Ray => [ray[0], ray[1], ray[2], ray[3]]

  // Getters

  export const origin = (ray: Ray): Vec2 => [ray[ORIGIN_X], ray[ORIGIN_Y]]

  export const direction = (ray: Ray): Vec2 => [ray[DIR_X], ray[DIR_Y]]

  // Operations (mutating)

  export const set = (out: Ray, originX: number, originY: number, directionX: number, directionY: number): void => {
    out[ORIGIN_X] = originX
    out[ORIGIN_Y] = originY
    out[DIR_X] = directionX
    out[DIR_Y] = directionY
  }

  export const copy = (out: Ray, ray: Ray): void => {
    out[0] = ray[0]
    out[1] = ray[1]
    out[2] = ray[2]
    out[3] = ray[3]
  }

  export const setOrigin = (out: Ray, origin: Vec2): void => {
    out[ORIGIN_X] = origin[0]
    out[ORIGIN_Y] = origin[1]
  }

  export const setDirection = (out: Ray, direction: Vec2): void => {
    out[DIR_X] = direction[0]
    out[DIR_Y] = direction[1]
  }

  /**
   * Get a point along the ray at distance t.
   */
  export const pointAt = (ray: Ray, t: number): Vec2 => [ray[ORIGIN_X] + ray[DIR_X] * t, ray[ORIGIN_Y] + ray[DIR_Y] * t]

  /**
   * Intersect ray with a line segment.
   * Returns intersection point and distance, or null if no intersection.
   */
  export const intersectSegment = (ray: Ray, a: Vec2, b: Vec2): RayIntersection | null => {
    const x1 = ray[ORIGIN_X]
    const y1 = ray[ORIGIN_Y]
    const dx1 = ray[DIR_X]
    const dy1 = ray[DIR_Y]
    const x2 = a[0]
    const y2 = a[1]
    const x3 = b[0]
    const y3 = b[1]

    const dx2 = x3 - x2
    const dy2 = y3 - y2

    const det = dx1 * dy2 - dy1 * dx2

    if (Math.abs(det) < 1e-10) {
      return intersectCollinear(ray, a, b)
    }

    const dx = x2 - x1
    const dy = y2 - y1

    const u = (dx * dy2 - dy * dx2) / det
    const v = (dx * dy1 - dy * dx1) / det

    if (u >= 0 && v >= 0 && v <= 1) {
      const intersectionX = x1 + u * dx1
      const intersectionY = y1 + u * dy1

      return {
        point: [intersectionX, intersectionY],
        distance: u * Math.sqrt(dx1 * dx1 + dy1 * dy1),
      }
    }

    return null
  }

  /**
   * Intersect ray with an AABB.
   * Returns all intersections sorted by distance.
   */
  export const intersectAabb = (ray: Ray, aabb: Aabb): RayIntersection[] => {
    const intersections: RayIntersection[] = []
    const originX = ray[ORIGIN_X]
    const originY = ray[ORIGIN_Y]
    const dirX = ray[DIR_X]
    const dirY = ray[DIR_Y]

    const left = aabb[0]
    const top = aabb[1]
    const right = aabb[2]
    const bottom = aabb[3]

    // Check horizontal edges
    if (originX >= left && originX <= right) {
      if ((originY < bottom && dirY > 0) || (originY > top && dirY < 0)) {
        const distance = top - originY
        intersections.push({
          point: [originX, top],
          distance,
        })
      }
      if ((originY > top && dirY < 0) || (originY < bottom && dirY > 0)) {
        const distance = bottom - originY
        intersections.push({
          point: [originX, bottom],
          distance,
        })
      }
    }

    // Check vertical edges
    if (originY >= top && originY <= bottom) {
      if ((originX < left && dirX > 0) || (originX > left && dirX < 0)) {
        const distance = left - originX
        intersections.push({
          point: [left, originY],
          distance,
        })
      }
      if ((originX > left && dirX < 0) || (originX < right && dirX > 0)) {
        const distance = right - originX
        intersections.push({
          point: [right, originY],
          distance,
        })
      }
    }

    intersections.sort((a, b) => a.distance - b.distance)
    return intersections
  }

  // Pre-allocated corners for intersectRect to avoid allocation
  const _rectCorners: [Vec2, Vec2, Vec2, Vec2] = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]

  /**
   * Intersect ray with a rectangle defined by position, size, and rotation.
   * Returns all intersections sorted by distance.
   */
  export const intersectRect = (ray: Ray, position: Vec2, size: Vec2, rotateZ: number = 0): RayIntersection[] => {
    Rect.getCorners(position, size, rotateZ, _rectCorners)

    const intersections: RayIntersection[] = []

    for (let i = 0; i < 4; i++) {
      const intersection = intersectSegment(ray, _rectCorners[i], _rectCorners[(i + 1) % 4])
      if (intersection) {
        intersections.push(intersection)
      }
    }

    intersections.sort((a, b) => a.distance - b.distance)
    return intersections
  }
}

// Helper for collinear ray-segment intersection
function intersectCollinear(ray: Ray, a: Vec2, b: Vec2): RayIntersection | null {
  const originX = ray[ORIGIN_X]
  const originY = ray[ORIGIN_Y]
  const dirX = ray[DIR_X]
  const dirY = ray[DIR_Y]

  // Degenerate segment
  if (a[0] === b[0] && a[1] === b[1]) {
    if (originX === a[0] && originY === a[1]) {
      return { point: [originX, originY], distance: 0 }
    }
    return null
  }

  // Horizontal ray and segment
  if (dirY === 0 && a[1] === b[1] && originY === a[1]) {
    return intersectAligned(ray, a, b, 0)
  }

  // Vertical ray and segment
  if (dirX === 0 && a[0] === b[0] && originX === a[0]) {
    return intersectAligned(ray, a, b, 1)
  }

  return null
}

function intersectAligned(ray: Ray, a: Vec2, b: Vec2, dimension: 0 | 1): RayIntersection | null {
  const origin = dimension === 0 ? ray[ORIGIN_X] : ray[ORIGIN_Y]
  const dir = dimension === 0 ? ray[DIR_X] : ray[DIR_Y]

  const min = Math.min(a[dimension], b[dimension])
  const max = Math.max(a[dimension], b[dimension])

  if (origin >= min && origin <= max) {
    return {
      point: [ray[ORIGIN_X], ray[ORIGIN_Y]],
      distance: 0,
    }
  }

  const candidates: RayIntersection[] = []

  if (dir > 0) {
    if (a[dimension] >= origin) {
      candidates.push({ point: a, distance: a[dimension] - origin })
    }
    if (b[dimension] >= origin) {
      candidates.push({ point: b, distance: b[dimension] - origin })
    }
  } else if (dir < 0) {
    if (a[dimension] <= origin) {
      candidates.push({ point: a, distance: origin - a[dimension] })
    }
    if (b[dimension] <= origin) {
      candidates.push({ point: b, distance: origin - b[dimension] })
    }
  }

  if (candidates.length === 0) return null
  return candidates.reduce((nearest, current) => (current.distance < nearest.distance ? current : nearest))
}
