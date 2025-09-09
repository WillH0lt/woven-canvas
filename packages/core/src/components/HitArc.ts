import { type Entity, component, field } from '@lastolivegames/becsy'
import type { Aabb } from './Aabb'
import type { Block } from './Block'
import type { HitCapsule } from './HitCapsule'

@component
export class HitArc {
  @field.float64.vector(2) declare a: [number, number]
  @field.float64.vector(2) declare b: [number, number]
  @field.float64.vector(2) declare c: [number, number]
  @field.float64 declare thickness: number
  @field.ref declare blockEntity: Entity

  // these fields get calculated from a, b, c
  @field.float64 declare _radius: number
  @field.float64.vector(2) declare _center: [number, number]
  @field.boolean declare _clockwise: boolean
  @field.float64 declare _arcAngle: number
  @field.float64 declare _startAngle: number
  @field.float64 declare _endAngle: number

  public update(a: [number, number], b: [number, number], c: [number, number]): void {
    this.a = a
    this.b = b
    this.c = c
    const center = computeCircleCenter(a, b, c)
    this._center = center || [0, 0]
    this._radius = Math.hypot(b[0] - this._center[0], b[1] - this._center[1])
    this._arcAngle = computeArcAngle(a, b, c, this._center)

    // it's clockwise if b is above the line from a to c
    this._clockwise = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0

    const cx = this._center[0]
    const cy = this._center[1]

    this._startAngle = Math.atan2(a[1] - cy, a[0] - cx)
    this._startAngle = normalizeAngle(this._startAngle)
    this._endAngle = this._startAngle + this._arcAngle * (this._clockwise ? -1 : 1)
    this._endAngle = normalizeAngle(this._endAngle)
  }

  public intersectsPoint(point: [number, number]): boolean {
    const dx = point[0] - this._center[0]
    const dy = point[1] - this._center[1]
    const dist = Math.hypot(dx, dy)

    // check if arc is within the radius
    const distToArc = Math.abs(dist - this._radius)
    if (distToArc > this.thickness / 2) return false

    // check if point is within the arc angle
    const angle = Math.atan2(dy, dx)
    if (!this.inArcAngle(angle)) return false

    return true
  }

  public intersectsAabb(aabb: Aabb): boolean {
    const { a, b, c } = this
    const center = this._center

    // Aabb superrounds arc
    for (const pt of [a, b, c]) {
      if (aabb.containsPoint(pt)) return true
    }

    const innerRadius = this._radius - this.thickness / 2
    const outerRadius = this._radius + this.thickness / 2

    // quick check if the circle has a chance of intersecting the AABB
    if (!circleAabbIntersect(center, outerRadius, aabb)) return false

    // if the aabb intersects the arc then it passes through the thickness of the arc
    // check if segments of the aabb intersect the arc
    const corners = [
      [aabb.left, aabb.top],
      [aabb.right, aabb.top],
      [aabb.right, aabb.bottom],
      [aabb.left, aabb.bottom],
    ]
    for (const radius of [outerRadius, innerRadius]) {
      for (let i = 0; i < corners.length; i++) {
        const p1 = corners[i] as [number, number]
        const p2 = corners[(i + 1) % corners.length] as [number, number]
        const points = segmentIntersectsCircle(p1, p2, center, radius)

        for (const pt of points) {
          if (this.inArcAngle(Math.atan2(pt[1] - center[1], pt[0] - center[0]))) {
            return true
          }
        }
      }
    }

    return false
  }

  public intersectsCapsule(capsule: HitCapsule): boolean {
    const innerRadius = this._radius - this.thickness / 2
    const outerRadius = this._radius + this.thickness / 2
    const center = this._center

    // segment intersects if one point is inside the outer circle and outside the inner circle
    // (ignoring capsule thickness for now)
    for (const radius of [outerRadius, innerRadius]) {
      const aInCircle = circleContainsPoint(center, radius, capsule.a)
      const bInCircle = circleContainsPoint(center, radius, capsule.b)
      if (aInCircle !== bInCircle) {
        if (this.inArcAngle(Math.atan2(capsule.a[1] - center[1], capsule.a[0] - center[0]))) {
          return true
        }
      }
    }

    return false
  }

  public intersectBlock(block: Block): [number, number][] {
    const intersectionPoints: [number, number][] = []

    const blockCorners = block.getCorners()

    // Find intersections with each edge of the block
    for (let i = 0; i < blockCorners.length; i++) {
      const p1 = blockCorners[i]
      const p2 = blockCorners[(i + 1) % blockCorners.length]

      const intersects = segmentIntersectsCircle(p1, p2, this._center, this._radius)
      for (const intersect of intersects) {
        if (this.pointToParametric(intersect) !== null) {
          intersectionPoints.push(intersect)
        }
      }
    }

    return intersectionPoints
  }

  public pointToParametric(point: [number, number]): number | null {
    const cx = this._center[0]
    const cy = this._center[1]

    let angle = Math.atan2(point[1] - cy, point[0] - cx)
    angle = normalizeAngle(angle)

    if (!this.inArcAngle(angle)) return null

    let deltaAngle = (angle - this._startAngle) * (this._clockwise ? -1 : 1)
    if (deltaAngle < 0) {
      deltaAngle += 2 * Math.PI
    }

    return deltaAngle / this._arcAngle
  }

  public parametricToPoint(t: number): [number, number] {
    const cx = this._center[0]
    const cy = this._center[1]

    const angle = this._startAngle + t * this._arcAngle * (this._clockwise ? -1 : 1)

    const x = cx + Math.cos(angle) * this._radius
    const y = cy + Math.sin(angle) * this._radius
    return [x, y]
  }

  public trim(tStart: number, tEnd: number): void {
    const newA = this.parametricToPoint(tStart)
    const newB = this.parametricToPoint((tStart + tEnd) / 2)
    const newC = this.parametricToPoint(tEnd)

    // Update the arc with new points
    this.update(newA, newB, newC)
  }

  public length(): number {
    return this._arcAngle * this._radius
  }

  public directionAt(t: number): [number, number] {
    const point = this.parametricToPoint(t)

    const tangent = [point[0] - this._center[0], point[1] - this._center[1]]
    const len = Math.hypot(tangent[0], tangent[1])
    if (len === 0) return [0, 0]

    // rotate 90 degrees to get direction
    if (this._clockwise) {
      return [tangent[1] / len, -tangent[0] / len]
    }
    return [-tangent[1] / len, tangent[0] / len]
  }

  public getExtremaPoints(rotateZ: number): [number, number][] {
    const { a, c } = this
    const extremaPoints = [a, c]

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + rotateZ
      if (this.inArcAngle(angle)) {
        const x = this._center[0] + Math.cos(angle) * this._radius
        const y = this._center[1] + Math.sin(angle) * this._radius
        extremaPoints.push([x, y])
      }
    }

    return extremaPoints
  }

  public inArcAngle(angle: number): boolean {
    angle = normalizeAngle(angle)

    if (this._clockwise) {
      if (this._startAngle < this._endAngle) {
        // Arc crosses the 0 angle
        return angle >= this._endAngle || angle <= this._startAngle
      }
      return angle >= this._endAngle && angle <= this._startAngle
    }

    if (this._startAngle > this._endAngle) {
      // Arc crosses the 0 angle
      return angle >= this._startAngle || angle <= this._endAngle
    }

    return angle >= this._startAngle && angle <= this._endAngle
  }
}

function circleContainsPoint(center: [number, number], radius: number, point: [number, number]): boolean {
  const dx = point[0] - center[0]
  const dy = point[1] - center[1]
  return dx ** 2 + dy ** 2 <= radius ** 2
}

function circleAabbIntersect(center: [number, number], radius: number, aabb: Aabb): boolean {
  const closestX = Math.max(aabb.left, Math.min(center[0], aabb.right))
  const closestY = Math.max(aabb.top, Math.min(center[1], aabb.bottom))

  const distanceSquared = (center[0] - closestX) ** 2 + (center[1] - closestY) ** 2
  return distanceSquared <= radius ** 2
}

function segmentIntersectsCircle(
  p1: [number, number],
  p2: [number, number],
  center: [number, number],
  r: number,
): [number, number][] {
  const d = [p2[0] - p1[0], p2[1] - p1[1]]
  const f = [p1[0] - center[0], p1[1] - center[1]]

  const a = d[0] * d[0] + d[1] * d[1]
  const b = 2 * (f[0] * d[0] + f[1] * d[1])
  const c = f[0] * f[0] + f[1] * f[1] - r * r

  // Degenerate segment (p1 == p2)
  if (a === 0) {
    const distSq = f[0] * f[0] + f[1] * f[1]
    if (Math.abs(distSq - r * r) <= 1e-12) {
      return [[p1[0], p1[1]]]
    }
    return []
  }

  let disc = b * b - 4 * a * c
  const EPS = 1e-12
  if (disc < -EPS) return []

  disc = Math.sqrt(Math.max(0, disc))
  const t1 = (-b - disc) / (2 * a)
  const t2 = (-b + disc) / (2 * a)

  const points: [number, number][] = []
  if (t1 >= 0 && t1 <= 1) {
    points.push([p1[0] + t1 * d[0], p1[1] + t1 * d[1]])
  }
  // Avoid duplicate points when tangent
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > EPS) {
    points.push([p1[0] + t2 * d[0], p1[1] + t2 * d[1]])
  }

  return points
}

function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI
  return angle
}

function computeArcAngle(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  center: [number, number],
): number {
  // Calculate angles from center to each point
  const angleA = Math.atan2(a[1] - center[1], a[0] - center[0])
  const angleB = Math.atan2(b[1] - center[1], b[0] - center[0])
  const angleC = Math.atan2(c[1] - center[1], c[0] - center[0])

  const normAngleA = normalizeAngle(angleA)
  const normAngleB = normalizeAngle(angleB)
  const normAngleC = normalizeAngle(angleC)

  // Determine if we're going clockwise or counterclockwise from A to C
  // We use point B to determine the direction

  // Calculate the shorter arc from A to C
  let shortArcFromAtoC = Math.abs(normAngleC - normAngleA)
  if (shortArcFromAtoC > Math.PI) {
    shortArcFromAtoC = 2 * Math.PI - shortArcFromAtoC
  }

  // Check if B lies on the shorter arc from A to C
  let bOnShorterArc = false
  const minAngle = Math.min(normAngleA, normAngleC)
  const maxAngle = Math.max(normAngleA, normAngleC)

  if (maxAngle - minAngle > Math.PI) {
    // The shorter arc crosses 0°, so B should be outside [minAngle, maxAngle]
    bOnShorterArc = normAngleB >= maxAngle || normAngleB <= minAngle
  } else {
    // The shorter arc doesn't cross 0°, so B should be inside [minAngle, maxAngle]
    bOnShorterArc = normAngleB >= minAngle && normAngleB <= maxAngle
  }

  // If B is on the shorter arc, return the shorter arc angle
  if (bOnShorterArc) {
    return shortArcFromAtoC
  }

  // If B is not on the shorter arc, return the longer arc angle
  return 2 * Math.PI - shortArcFromAtoC
}

function computeCircleCenter(a: [number, number], b: [number, number], c: [number, number]): [number, number] | null {
  const x1 = a[0]
  const y1 = a[1]
  const x2 = b[0]
  const y2 = b[1]
  const x3 = c[0]
  const y3 = c[1]

  // Check if points are collinear (no unique circle can be formed)
  const det = (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  if (Math.abs(det) < 1e-10) {
    return null // Points are collinear
  }

  // Calculate the center using the perpendicular bisector method
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))

  if (Math.abs(d) < 1e-10) {
    return null // Points are collinear (alternative check)
  }

  const ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / d
  const uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / d

  return [ux, uy]
}
