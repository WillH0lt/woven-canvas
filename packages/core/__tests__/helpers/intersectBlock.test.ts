import { comps } from '@infinitecanvas/core'
import { intersectBlock } from '../../src/helpers/intersectAabb'
import { MockEntity } from './MockEntity'

describe('intersectBlock', () => {
  it('returns empty array if no blocks', () => {
    const block = new comps.Block()
    block.left = 0
    block.top = 0
    block.width = 10
    block.height = 10

    const result = intersectBlock(block, [])

    expect(result).toEqual([])

    console.log('Result:', result)
  })

  it('returns intersecting blocks', () => {
    const block = new comps.Block()
    block.left = 0
    block.top = 0
    block.width = 10
    block.height = 10
    const e1 = new MockEntity({ left: 5, top: 5, width: 10, height: 10 }) // overlaps
    const e2 = new MockEntity({ left: 20, top: 20, width: 5, height: 5 }) // no overlap
    const e3 = new MockEntity({ left: -5, top: -5, width: 6, height: 6 }) // overlaps

    // @ts-ignore
    const result = intersectBlock(block, [e1, e2, e3])
    expect(result).toEqual([e1, e3])
    expect(result.length).toBe(2)
  })

  it('handles edge touching as no intersection', () => {
    const block = new comps.Block()
    block.left = 0
    block.top = 0
    block.width = 10
    block.height = 10
    const e1 = new MockEntity({ left: 10, top: 0, width: 5, height: 5 }) // right edge
    const e2 = new MockEntity({ left: 0, top: 10, width: 5, height: 5 }) // bottom edge
    const e3 = new MockEntity({ left: -5, top: 0, width: 5, height: 5 }) // left edge
    const e4 = new MockEntity({ left: 0, top: -5, width: 5, height: 5 }) // top edge

    // @ts-ignore
    const result = intersectBlock(block, [e1, e2, e3, e4])
    expect(result).toEqual([])
  })
})
