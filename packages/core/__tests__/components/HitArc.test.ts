import { HitArc } from '../../src/components'

describe('HitArc', () => {
  it('should create a HitArc from three points (clockwise)', () => {
    const p1: [number, number] = [0, 0]
    const p2: [number, number] = [1, 1]
    const p3: [number, number] = [2, 0]

    const arc = new HitArc()
    arc.update(p1, p2, p3)
    expect(arc._center[0]).toBeCloseTo(1)
    expect(arc._center[1]).toBeCloseTo(0)
    expect(arc._radius).toBeCloseTo(1)
    expect(arc._startAngle).toBeCloseTo(Math.PI)
    expect(arc._endAngle).toBeCloseTo(0)
    expect(arc._clockwise).toBe(true)
  })

  it('should create a HitArc from three points (counter-clockwise)', () => {
    const p1: [number, number] = [0, 0]
    const p2: [number, number] = [-1, 1]
    const p3: [number, number] = [-2, 0]

    const arc = new HitArc()
    arc.update(p1, p2, p3)
    expect(arc._center[0]).toBeCloseTo(-1)
    expect(arc._center[1]).toBeCloseTo(0)
    expect(arc._radius).toBeCloseTo(1)
    expect(arc._startAngle).toBeCloseTo(0)
    expect(arc._endAngle).toBeCloseTo(Math.PI)
    expect(arc._clockwise).toBe(false)
  })

  it('should compute extremaPoints with zero rotation', () => {
    const p1: [number, number] = [0, 0]
    const p2: [number, number] = [-1, 1]
    const p3: [number, number] = [-2, 0]

    const arc = new HitArc()
    arc.update(p1, p2, p3)

    const extrema = arc.getExtremaPoints(0)
    expect(extrema.length).toBe(5)
    expect(extrema[0][0]).toBeCloseTo(p1[0])
    expect(extrema[0][1]).toBeCloseTo(p1[1])
    expect(extrema[1][0]).toBeCloseTo(p3[0])
    expect(extrema[1][1]).toBeCloseTo(p3[1])
    expect(extrema[2][0]).toBeCloseTo(0)
    expect(extrema[2][1]).toBeCloseTo(0)
    expect(extrema[3][0]).toBeCloseTo(-1)
    expect(extrema[3][1]).toBeCloseTo(1)
    expect(extrema[4][0]).toBeCloseTo(-2)
    expect(extrema[4][1]).toBeCloseTo(0)
  })

  it('should calculate if point is in arc angle', () => {
    const a1: [number, number] = [0, 0]
    const b1: [number, number] = [1, 1]
    const c1: [number, number] = [2, 0]

    const arc = new HitArc()
    arc.update(a1, b1, c1)

    expect(arc.inArcAngle(Math.PI / 2)).toBe(true)
    expect(arc.inArcAngle((3 * Math.PI) / 2)).toBe(false)

    const a2: [number, number] = [0, 0]
    const b2: [number, number] = [-1, 1]
    const c2: [number, number] = [-2, 0]

    arc.update(a2, b2, c2)

    expect(arc.inArcAngle(Math.PI / 2)).toBe(true)
    expect(arc.inArcAngle((3 * Math.PI) / 2)).toBe(false)

    const a3: [number, number] = [0, 0]
    const b3: [number, number] = [1, -1]
    const c3: [number, number] = [0, -2]

    arc.update(a3, b3, c3)

    expect(arc.inArcAngle(0)).toBe(true)
    expect(arc.inArcAngle(Math.PI)).toBe(false)

    const a4: [number, number] = [0, -2]
    const b4: [number, number] = [1, -1]
    const c4: [number, number] = [0, 0]

    arc.update(a4, b4, c4)

    expect(arc.inArcAngle(0)).toBe(true)
    expect(arc.inArcAngle(Math.PI)).toBe(false)
  })

  it('should handle collinear points', () => {
    const p1: [number, number] = [0, 0]
    const p2: [number, number] = [1, 1]
    const p3: [number, number] = [2, 2]

    const arc = new HitArc()
    arc.update(p1, p2, p3)
    expect(arc._radius).toBe(Number.POSITIVE_INFINITY)
  })

  it('should trim the arc correctly', () => {
    const p1: [number, number] = [0, 0]
    const p2: [number, number] = [1, 1]
    const p3: [number, number] = [2, 0]

    const arc = new HitArc()
    arc.update(p1, p2, p3)
    arc.trim(0.25, 0.75)
    expect(arc).not.toBeNull()
    if (arc) {
      const startPoint = arc.parametricToPoint(0.25)
      const endPoint = arc.parametricToPoint(0.75)
      expect(startPoint[0]).toBeCloseTo(1.7071, 4)
      expect(startPoint[1]).toBeCloseTo(0.2929, 4)
      expect(endPoint[0]).toBeCloseTo(0.2929, 4)
      expect(endPoint[1]).toBeCloseTo(0.2929, 4)
    }
  })
})
