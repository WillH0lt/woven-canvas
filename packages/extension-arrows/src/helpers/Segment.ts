import type { Aabb, Block } from '@infinitecanvas/core/components'

export class Segment {
  constructor(
    public readonly a: [number, number],
    public readonly b: [number, number],
  ) {}

  public intersectAabb(aabb: Aabb): [number, number][] {
    const corners = aabb.getCorners()
    return intersectPolygon(corners, this)
  }

  public intersectSegment(other: Segment): [number, number] | null {
    const [x1, y1] = this.a
    const [x2, y2] = this.b
    const [x3, y3] = other.a
    const [x4, y4] = other.b

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

    if (Math.abs(denom) < 1e-10) {
      return null // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const x = x1 + t * (x2 - x1)
      const y = y1 + t * (y2 - y1)
      return [x, y]
    }

    return null
  }

  public intersectBlock(block: Block): [number, number][] {
    const corners = block.getCorners()
    return intersectPolygon(corners, this)
  }

  public pointToParametric(point: [number, number]): number {
    const [ax, ay] = this.a
    const [bx, by] = this.b
    const abx = bx - ax
    const aby = by - ay
    const abLengthSq = abx * abx + aby * aby

    if (abLengthSq === 0) return 0 // a and b are the same point

    const apx = point[0] - ax
    const apy = point[1] - ay
    const t = (apx * abx + apy * aby) / abLengthSq
    return Math.max(0, Math.min(1, t))
  }
}

function intersectPolygon(corners: [number, number][], segment: Segment): [number, number][] {
  const points: [number, number][] = []

  // Check intersection with each edge of the polygon
  for (let i = 0; i < corners.length; i++) {
    const start = corners[i]
    const end = corners[(i + 1) % corners.length]
    const edge = new Segment(start, end)
    const intersection = segment.intersectSegment(edge)
    if (intersection) {
      points.push(intersection)
    }
  }

  return points
}
