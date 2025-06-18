import { describe, expect, it } from 'vitest'
import { intersectPoint } from '../../src/helpers/intersectPoint'
import { MockEntity } from './MockEntity'

describe('intersectPoint', () => {
  it('returns null if no blocks', () => {
    const point: [number, number] = [5, 5]
    const result = intersectPoint(point, [])
    expect(result).toBeNull()
  })

  it('returns the first block containing the point', () => {
    const point: [number, number] = [6, 6]
    const e1 = new MockEntity({ left: 0, top: 0, width: 5, height: 5 }) // does not contain
    const e2 = new MockEntity({ left: 5, top: 5, width: 10, height: 10 }) // contains
    const e3 = new MockEntity({ left: 6, top: 6, width: 1, height: 1 }) // also contains, but after e2

    // @ts-ignore
    const result = intersectPoint(point, [e1, e2, e3])
    expect(result).toBe(e2)
  })

  it('returns null if point is outside all blocks', () => {
    const point: [number, number] = [100, 100]
    const e1 = new MockEntity({ left: 0, top: 0, width: 10, height: 10 })
    const e2 = new MockEntity({ left: -10, top: -10, width: 5, height: 5 })

    // @ts-ignore
    const result = intersectPoint(point, [e1, e2])
    expect(result).toBeNull()
  })

  it('returns block if point is on the edge (inclusive)', () => {
    const point: [number, number] = [10, 10]
    const e1 = new MockEntity({ left: 0, top: 0, width: 10, height: 10 }) // right/bottom edge

    // @ts-ignore
    const result = intersectPoint(point, [e1])
    expect(result).toBe(e1)
  })
})
