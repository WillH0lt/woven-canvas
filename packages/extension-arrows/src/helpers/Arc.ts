import {} from '@infinitecanvas/core/components'
import {} from '@infinitecanvas/core/helpers'

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
  const [x1, y1] = a
  const [x2, y2] = b
  const [x3, y3] = c

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

// assumes angles have been normalized between [0, 2 * PI]
function angleIsBetween(angle: number, a: number, b: number): boolean {
  if (a < b) {
    return angle >= a && angle <= b
  }
  return angle >= a || angle <= b
}

export class Arc {
  public radius: number
  public center: [number, number]
  public clockwise: boolean
  public arcAngle: number

  constructor(
    public a: [number, number],
    public b: [number, number],
    public c: [number, number],
  ) {
    const center = computeCircleCenter(a, b, c)
    this.center = center || [0, 0]
    this.radius = Math.hypot(b[0] - this.center[0], b[1] - this.center[1])
    this.arcAngle = computeArcAngle(a, b, c, this.center)

    // it's clockwise if b is above the line from a to c
    this.clockwise = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0
  }

  public getExtremaPoints(rotateZ: number): [number, number][] {
    const { a, c } = this
    const extremaPoints = [a, c]

    const [cx, cy] = this.center

    let startAngle = this.clockwise ? Math.atan2(a[1] - cy, a[0] - cx) : Math.atan2(c[1] - cy, c[0] - cx)
    let endAngle = startAngle + this.arcAngle

    startAngle = normalizeAngle(startAngle)
    endAngle = normalizeAngle(endAngle)

    for (let i = 0; i < 4; i++) {
      let angle = (i * Math.PI) / 2 + rotateZ
      angle = normalizeAngle(angle)
      if (angleIsBetween(angle, startAngle, endAngle)) {
        const x = cx + Math.cos(angle) * this.radius
        const y = cy + Math.sin(angle) * this.radius
        extremaPoints.push([x, y])
      }
    }

    return extremaPoints

    // const aabb = new Aabb().setByPoints(extremaPoints)
    // const center = aabb.getCenter()

    // const m = newRotationMatrixAroundPoint(rotateZ, center)
    // for (const point of extremaPoints) {
    //   const transformed = transformPoint(m, point)
    //   point[0] = transformed[0]
    //   point[1] = transformed[1]
    // }

    // const aabb2 = new Aabb().setByPoints(extremaPoints)

    // return new Block({
    //   left: aabb2.left,
    //   top: aabb2.top,
    //   width: aabb2.right - aabb2.left,
    //   height: aabb2.bottom - aabb2.top,
    //   rotateZ,
    // })
  }

  public getPointAlongArc(t: number): [number, number] {
    const { a, c } = this
    const [cx, cy] = this.center

    let startAngle = this.clockwise ? Math.atan2(a[1] - cy, a[0] - cx) : Math.atan2(c[1] - cy, c[0] - cx)
    startAngle = normalizeAngle(startAngle)

    const angle = startAngle + t * this.arcAngle
    const x = cx + Math.cos(angle) * this.radius
    const y = cy + Math.sin(angle) * this.radius
    return [x, y]
  }
}
