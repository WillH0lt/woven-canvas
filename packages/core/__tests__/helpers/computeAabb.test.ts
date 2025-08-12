import { describe, expect, it } from 'vitest'
import { getAabb } from '../../src/helpers/aabb'
import { MockEntity } from './MockEntity'

describe('computeAabb', () => {
  it('returns infinities for empty input', () => {
    const result = getAabb([])
    expect(result.left).toBe(Number.POSITIVE_INFINITY)
    expect(result.right).toBe(Number.NEGATIVE_INFINITY)
    expect(result.top).toBe(Number.POSITIVE_INFINITY)
    expect(result.bottom).toBe(Number.NEGATIVE_INFINITY)
  })

  it('returns correct aabb for one block', () => {
    const e1 = new MockEntity({ left: 1, top: 2, width: 3, height: 4 })

    // @ts-ignore
    const result = getAabb([e1])
    expect(result.left).toBe(1)
    expect(result.right).toBe(4) // 1 + 3
    expect(result.top).toBe(2)
    expect(result.bottom).toBe(6) // 2 + 4
  })

  it('returns correct aabb for multiple blocks', () => {
    const e1 = new MockEntity({ left: 1, top: 2, width: 3, height: 4 })
    const e2 = new MockEntity({ left: 5, top: 6, width: 2, height: 3 })

    // @ts-ignore
    const result = getAabb([e1, e2])
    expect(result.left).toBe(1)
    expect(result.right).toBe(7) // max(4, 7)
    expect(result.top).toBe(2)
    expect(result.bottom).toBe(9) // max(6, 9)
  })

  it('handles blocks with zero width/height', () => {
    const e1 = new MockEntity({ left: 1, top: 2, width: 0, height: 4 })
    const e2 = new MockEntity({ left: 5, top: 6, width: 2, height: 0 })

    // @ts-ignore
    const result = getAabb([e1, e2])
    expect(result.left).toBe(1)
    expect(result.right).toBe(7) // max(1, 7)
    expect(result.top).toBe(2)
    expect(result.bottom).toBe(6) // max(6, 6)
  })
})
