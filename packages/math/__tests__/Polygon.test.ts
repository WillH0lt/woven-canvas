import { describe, expect, it } from 'vitest'
import { Capsule } from '../src/Capsule'
import { Polygon } from '../src/Polygon'

// A 10x10 axis-aligned square from (0,0) to (10,10).
const SQUARE = [0, 0, 10, 0, 10, 10, 0, 10]
const SQUARE_COUNT = 4

// A self-intersecting "bowtie". Vertices traced bottom-left -> top-right ->
// bottom-right -> top-left, so the two diagonals cross at the center (5,5).
// Under the even-odd rule the LEFT and RIGHT triangles are filled, while the
// TOP and BOTTOM wedges are empty (overlapped an even number of times) — the
// same way a spiral renders alternating filled/empty bands.
const BOWTIE = [0, 0, 10, 10, 10, 0, 0, 10]
const BOWTIE_COUNT = 4

describe('Polygon.containsPointEvenOdd', () => {
  it('returns true for a point inside a simple square', () => {
    expect(Polygon.containsPointEvenOdd(SQUARE, SQUARE_COUNT, [5, 5])).toBe(true)
  })

  it('returns false for a point outside the square', () => {
    expect(Polygon.containsPointEvenOdd(SQUARE, SQUARE_COUNT, [15, 5])).toBe(false)
    expect(Polygon.containsPointEvenOdd(SQUARE, SQUARE_COUNT, [-1, 5])).toBe(false)
  })

  it('returns false for degenerate polygons (< 3 vertices)', () => {
    expect(Polygon.containsPointEvenOdd([0, 0, 10, 10], 2, [5, 5])).toBe(false)
  })

  it('leaves even-overlap regions empty (even-odd rule)', () => {
    // The right triangle is filled (odd crossings).
    expect(Polygon.containsPointEvenOdd(BOWTIE, BOWTIE_COUNT, [8, 5])).toBe(true)
    // The left triangle is filled too.
    expect(Polygon.containsPointEvenOdd(BOWTIE, BOWTIE_COUNT, [2, 5])).toBe(true)
    // The top wedge is empty (even crossings) — an even-odd hole.
    expect(Polygon.containsPointEvenOdd(BOWTIE, BOWTIE_COUNT, [5, 8])).toBe(false)
  })
})

describe('Polygon.intersectsCapsule (eraser)', () => {
  it('hits when a capsule endpoint is inside the fill', () => {
    const capsule = Capsule.create(5, 5, 50, 50, 1)
    expect(Polygon.intersectsCapsule(SQUARE, SQUARE_COUNT, capsule)).toBe(true)
  })

  it('hits when a thin capsule crosses the boundary from outside', () => {
    // Both endpoints outside, but the segment passes straight through the square.
    const capsule = Capsule.create(-5, 5, 15, 5, 0.5)
    expect(Polygon.intersectsCapsule(SQUARE, SQUARE_COUNT, capsule)).toBe(true)
  })

  it('hits when a capsule grazes an edge within its radius', () => {
    // Endpoint sits 2px outside the right edge; radius 3 reaches it.
    const capsule = Capsule.create(12, 5, 20, 5, 3)
    expect(Polygon.intersectsCapsule(SQUARE, SQUARE_COUNT, capsule)).toBe(true)
  })

  it('misses when the capsule stays outside beyond its radius', () => {
    const capsule = Capsule.create(20, 5, 30, 5, 3)
    expect(Polygon.intersectsCapsule(SQUARE, SQUARE_COUNT, capsule)).toBe(false)
  })

  it('misses an even-odd hole when the capsule stays within it', () => {
    // A tiny capsule parked in the empty top wedge of the bowtie should not hit:
    // both endpoints are outside the filled region and stay clear of the
    // crossing diagonals (perpendicular distance ~2.1 > radius).
    const capsule = Capsule.create(5, 7.7, 5, 8.3, 0.1)
    expect(Polygon.intersectsCapsule(BOWTIE, BOWTIE_COUNT, capsule)).toBe(false)
  })
})

describe('Polygon.intersectsAabb (marquee/erase box)', () => {
  it('hits when the box overlaps the polygon', () => {
    expect(Polygon.intersectsAabb(SQUARE, SQUARE_COUNT, [5, 5, 15, 15])).toBe(true)
  })

  it('hits when the box is fully inside the polygon', () => {
    expect(Polygon.intersectsAabb(SQUARE, SQUARE_COUNT, [3, 3, 7, 7])).toBe(true)
  })

  it('hits when the polygon is fully inside the box', () => {
    expect(Polygon.intersectsAabb(SQUARE, SQUARE_COUNT, [-5, -5, 15, 15])).toBe(true)
  })

  it('misses when the box is entirely outside', () => {
    expect(Polygon.intersectsAabb(SQUARE, SQUARE_COUNT, [20, 20, 30, 30])).toBe(false)
  })
})
