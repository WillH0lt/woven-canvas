import { type Entity, component, field } from '@lastolivegames/becsy'

import { Aabb } from './Aabb'
import type { Block } from './Block'

@component
export class HitCapsule {
  @field.float32.vector(2) declare a: [number, number]
  @field.float32.vector(2) declare b: [number, number]
  @field.float32 declare radius: number
  @field.ref declare blockEntity: Entity

  constructor(data: Record<string, any> = {}) {
    Object.assign(this, data)
  }

  public intersectsPoint(point: [number, number]): boolean {
    const { a, b, radius } = this

    const [px, py] = point
    const ax = a[0]
    const ay = a[1]
    const bx = b[0]
    const by = b[1]

    // Vector from a to b
    const abx = bx - ax
    const aby = by - ay

    // Vector from a to point
    const apx = px - ax
    const apy = py - ay

    // Length squared of ab vector
    const abLengthSq = abx * abx + aby * aby

    // Handle degenerate case where a and b are the same point
    if (abLengthSq === 0) {
      const distSq = apx * apx + apy * apy
      return distSq <= radius * radius
    }

    // Project point onto line segment ab
    // t represents the position along the line segment (0 = at a, 1 = at b)
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLengthSq))

    // Find the closest point on the line segment to our point
    const closestX = ax + t * abx
    const closestY = ay + t * aby

    // Calculate distance from point to closest point on line segment
    const distanceX = px - closestX
    const distanceY = py - closestY
    const distanceSq = distanceX * distanceX + distanceY * distanceY

    // Check if distance is within radius
    return distanceSq <= radius * radius
  }

  private getAabb(): Aabb {
    const { a, b, radius } = this

    return new Aabb({
      left: Math.min(a[0], b[0]) - radius,
      top: Math.min(a[1], b[1]) - radius,
      right: Math.max(a[0], b[0]) + radius,
      bottom: Math.max(a[1], b[1]) + radius,
    })
  }

  public intersectsAabb(aabb: Aabb): boolean {
    // Quick reject using capsule's AABB
    const capsuleAabb = this.getAabb()

    if (!aabb.intersectsAabb(capsuleAabb)) {
      return false
    }

    const { a, b, radius: r } = this

    const ax = a[0]
    const ay = a[1]
    const bx = b[0]
    const by = b[1]

    // Degenerate capsule (circle)
    if (ax === bx && ay === by) {
      const dx = Math.max(aabb.left - ax, 0, ax - aabb.right)
      const dy = Math.max(aabb.top - ay, 0, ay - aabb.bottom)
      return dx * dx + dy * dy <= r * r
    }

    // If either endpoint is inside the AABB, we intersect (radius >= 0)
    if (aabb.containsPoint(a) || aabb.containsPoint(b)) {
      return true
    }

    // Rectangle edges as segments
    const l = aabb.left
    const rgt = aabb.right
    const tp = aabb.top
    const bt = aabb.bottom

    const edges: [number, number, number, number][] = [
      [l, tp, rgt, tp], // top
      [rgt, tp, rgt, bt], // right
      [rgt, bt, l, bt], // bottom
      [l, bt, l, tp], // left
    ]

    // If the segment crosses any edge, it intersects the rectangle interior
    for (const [cx, cy, dx, dy] of edges) {
      if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) {
        return true
      }
    }

    // Otherwise compute the minimum distance from segment to rectangle edges
    let minDistSq = Number.POSITIVE_INFINITY
    for (const [cx, cy, dx, dy] of edges) {
      const d2 = segmentSegmentDistSq(ax, ay, bx, by, cx, cy, dx, dy)
      if (d2 < minDistSq) minDistSq = d2
    }

    return minDistSq <= r ** 2
  }

  public intersectsBlock(block: Block): boolean {
    const { a, b, radius } = this

    // Get block corners to work with oriented rectangle
    const corners = block.getCorners()

    // Quick check: if capsule endpoints are inside the block
    if (block.intersectsPoint(a) || block.intersectsPoint(b)) {
      return true
    }

    // Check if any corner of the block is within the capsule
    for (const corner of corners) {
      if (this.intersectsPoint(corner)) {
        return true
      }
    }

    // Check distance from capsule line segment to each edge of the block
    let minDistanceSq = Number.POSITIVE_INFINITY

    for (let i = 0; i < corners.length; i++) {
      const edgeStart = corners[i]
      const edgeEnd = corners[(i + 1) % corners.length]

      const distSq = segmentSegmentDistSq(a[0], a[1], b[0], b[1], edgeStart[0], edgeStart[1], edgeEnd[0], edgeEnd[1])

      minDistanceSq = Math.min(minDistanceSq, distSq)
    }

    // Intersection occurs if minimum distance is within radius
    return minDistanceSq <= radius * radius
  }

  public intersectsCapsule(other: HitCapsule): boolean {
    const { a: a1, b: b1, radius: r1 } = this
    const { a: a2, b: b2, radius: r2 } = other

    // Calculate the minimum distance between the two line segments
    const minDistSq = segmentSegmentDistSq(a1[0], a1[1], b1[0], b1[1], a2[0], a2[1], b2[0], b2[1])

    // Combined radius threshold
    const combinedRadius = r1 + r2
    const combinedRadiusSq = combinedRadius * combinedRadius

    // Capsules intersect if the distance between segments is within combined radius
    return minDistSq <= combinedRadiusSq
  }

  public trim(tStart: number, tEnd: number): void {
    const newA = this.parametricToPoint(tStart)
    const newB = this.parametricToPoint(tEnd)

    // Update the capsule with new points
    this.a = newA
    this.b = newB
  }

  public parametricToPoint(t: number): [number, number] {
    const { a, b } = this
    const x = a[0] + t * (b[0] - a[0])
    const y = a[1] + t * (b[1] - a[1])
    return [x, y]
  }
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const o1 = orientation(ax, ay, bx, by, cx, cy)
  const o2 = orientation(ax, ay, bx, by, dx, dy)
  const o3 = orientation(cx, cy, dx, dy, ax, ay)
  const o4 = orientation(cx, cy, dx, dy, bx, by)

  if (o1 !== o2 && o3 !== o4) return true

  // Colinear special cases
  if (o1 === 0 && onSegment(ax, ay, cx, cy, bx, by)) return true
  if (o2 === 0 && onSegment(ax, ay, dx, dy, bx, by)) return true
  if (o3 === 0 && onSegment(cx, cy, ax, ay, dx, dy)) return true
  if (o4 === 0 && onSegment(cx, cy, bx, by, dx, dy)) return true

  return false
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const val = (by - ay) * (cx - bx) - (bx - ax) * (cy - by)
  if (val === 0) return 0
  return val > 0 ? 1 : 2
}

function onSegment(ax: number, ay: number, px: number, py: number, bx: number, by: number): boolean {
  return Math.min(ax, bx) <= px && px <= Math.max(ax, bx) && Math.min(ay, by) <= py && py <= Math.max(ay, by)
}

function pointSegmentDistSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLenSq = abx * abx + aby * aby
  if (abLenSq === 0) {
    const dx = px - ax
    const dy = py - ay
    return dx * dx + dy * dy
  }
  let t = (apx * abx + apy * aby) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * abx
  const cy = ay + t * aby
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy
}

function segmentSegmentDistSq(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0
  const d1 = pointSegmentDistSq(ax, ay, cx, cy, dx, dy)
  const d2 = pointSegmentDistSq(bx, by, cx, cy, dx, dy)
  const d3 = pointSegmentDistSq(cx, cy, ax, ay, bx, by)
  const d4 = pointSegmentDistSq(dx, dy, ax, ay, bx, by)
  return Math.min(d1, d2, d3, d4)
}
