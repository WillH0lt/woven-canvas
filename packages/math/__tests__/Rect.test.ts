import { describe, expect, it } from 'vitest'
import { Mat2 } from '../src/Mat2'
import { Rect } from '../src/Rect'
import type { Vec2 } from '../src/Vec2'

describe('Rect UV conversions', () => {
  describe('uvToWorld', () => {
    it('should map UV (0,0) to top-left corner for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0

      const world = Rect.uvToWorld(position, size, rotateZ, [0, 0])
      expect(world[0]).toBeCloseTo(100, 10)
      expect(world[1]).toBeCloseTo(200, 10)
    })

    it('should map UV (1,1) to bottom-right corner for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0

      const world = Rect.uvToWorld(position, size, rotateZ, [1, 1])
      expect(world[0]).toBeCloseTo(150, 10)
      expect(world[1]).toBeCloseTo(230, 10)
    })

    it('should map UV (0.5,0.5) to center for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0

      const world = Rect.uvToWorld(position, size, rotateZ, [0.5, 0.5])
      expect(world[0]).toBeCloseTo(125, 10)
      expect(world[1]).toBeCloseTo(215, 10)
    })
  })

  describe('worldToUv', () => {
    it('should map top-left corner to UV (0,0) for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0

      const uv = Rect.worldToUv(position, size, rotateZ, [100, 200])
      expect(uv[0]).toBeCloseTo(0, 10)
      expect(uv[1]).toBeCloseTo(0, 10)
    })

    it('should map bottom-right corner to UV (1,1) for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0

      const uv = Rect.worldToUv(position, size, rotateZ, [150, 230])
      expect(uv[0]).toBeCloseTo(1, 10)
      expect(uv[1]).toBeCloseTo(1, 10)
    })

    it('should map center to UV (0.5,0.5) for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0

      const uv = Rect.worldToUv(position, size, rotateZ, [125, 215])
      expect(uv[0]).toBeCloseTo(0.5, 10)
      expect(uv[1]).toBeCloseTo(0.5, 10)
    })
  })

  describe('round-trip: uvToWorld -> worldToUv', () => {
    it('should return original UV for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0
      const originalUv: Vec2 = [0.25, 0.75]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      const resultUv = Rect.worldToUv(position, size, rotateZ, world)

      expect(resultUv[0]).toBeCloseTo(originalUv[0], 10)
      expect(resultUv[1]).toBeCloseTo(originalUv[1], 10)
    })

    it('should return original UV for 90-degree rotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 2
      const originalUv: Vec2 = [0.25, 0.75]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      const resultUv = Rect.worldToUv(position, size, rotateZ, world)

      expect(resultUv[0]).toBeCloseTo(originalUv[0], 10)
      expect(resultUv[1]).toBeCloseTo(originalUv[1], 10)
    })

    it('should return original UV for 45-degree rotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const originalUv: Vec2 = [0.1, 0.9]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      const resultUv = Rect.worldToUv(position, size, rotateZ, world)

      expect(resultUv[0]).toBeCloseTo(originalUv[0], 10)
      expect(resultUv[1]).toBeCloseTo(originalUv[1], 10)
    })
  })

  describe('round-trip: worldToUv -> uvToWorld', () => {
    it('should return original world coords for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0
      const originalWorld: Vec2 = [120, 210]

      const uv = Rect.worldToUv(position, size, rotateZ, originalWorld)
      const resultWorld = Rect.uvToWorld(position, size, rotateZ, uv)

      expect(resultWorld[0]).toBeCloseTo(originalWorld[0], 10)
      expect(resultWorld[1]).toBeCloseTo(originalWorld[1], 10)
    })

    it('should return original world coords for 90-degree rotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 2
      const originalWorld: Vec2 = [120, 210]

      const uv = Rect.worldToUv(position, size, rotateZ, originalWorld)
      const resultWorld = Rect.uvToWorld(position, size, rotateZ, uv)

      expect(resultWorld[0]).toBeCloseTo(originalWorld[0], 10)
      expect(resultWorld[1]).toBeCloseTo(originalWorld[1], 10)
    })

    it('should return original world coords for 45-degree rotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const originalWorld: Vec2 = [120, 210]

      const uv = Rect.worldToUv(position, size, rotateZ, originalWorld)
      const resultWorld = Rect.uvToWorld(position, size, rotateZ, uv)

      expect(resultWorld[0]).toBeCloseTo(originalWorld[0], 10)
      expect(resultWorld[1]).toBeCloseTo(originalWorld[1], 10)
    })
  })

  describe('edge cases', () => {
    it('should handle rect at origin', () => {
      const position: Vec2 = [0, 0]
      const size: Vec2 = [100, 100]
      const rotateZ = 0
      const originalUv: Vec2 = [0.5, 0.5]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      expect(world[0]).toBeCloseTo(50, 10)
      expect(world[1]).toBeCloseTo(50, 10)

      const resultUv = Rect.worldToUv(position, size, rotateZ, world)
      expect(resultUv[0]).toBeCloseTo(originalUv[0], 10)
      expect(resultUv[1]).toBeCloseTo(originalUv[1], 10)
    })

    it('should handle non-square rect with rotation', () => {
      const position: Vec2 = [0, 0]
      const size: Vec2 = [200, 50] // wide rect
      const rotateZ = Math.PI / 6 // 30 degrees
      const originalUv: Vec2 = [0.2, 0.8]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      const resultUv = Rect.worldToUv(position, size, rotateZ, world)

      expect(resultUv[0]).toBeCloseTo(originalUv[0], 10)
      expect(resultUv[1]).toBeCloseTo(originalUv[1], 10)
    })

    it('should handle negative position', () => {
      const position: Vec2 = [-100, -200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0
      const originalUv: Vec2 = [0, 0]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      expect(world[0]).toBeCloseTo(-100, 10)
      expect(world[1]).toBeCloseTo(-200, 10)
    })

    it('should handle 180-degree rotation', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI
      const originalUv: Vec2 = [0.3, 0.7]

      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      const resultUv = Rect.worldToUv(position, size, rotateZ, world)

      expect(resultUv[0]).toBeCloseTo(originalUv[0], 10)
      expect(resultUv[1]).toBeCloseTo(originalUv[1], 10)
    })
  })

  describe('corner mapping with rotation', () => {
    it('UV corners should match getCorners output', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4

      const corners: [Vec2, Vec2, Vec2, Vec2] = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]
      Rect.getCorners(position, size, rotateZ, corners)

      // UV (0,0) should be top-left corner
      const tl = Rect.uvToWorld(position, size, rotateZ, [0, 0])
      expect(tl[0]).toBeCloseTo(corners[0][0], 10)
      expect(tl[1]).toBeCloseTo(corners[0][1], 10)

      // UV (1,0) should be top-right corner
      const tr = Rect.uvToWorld(position, size, rotateZ, [1, 0])
      expect(tr[0]).toBeCloseTo(corners[1][0], 10)
      expect(tr[1]).toBeCloseTo(corners[1][1], 10)

      // UV (1,1) should be bottom-right corner
      const br = Rect.uvToWorld(position, size, rotateZ, [1, 1])
      expect(br[0]).toBeCloseTo(corners[2][0], 10)
      expect(br[1]).toBeCloseTo(corners[2][1], 10)

      // UV (0,1) should be bottom-left corner
      const bl = Rect.uvToWorld(position, size, rotateZ, [0, 1])
      expect(bl[0]).toBeCloseTo(corners[3][0], 10)
      expect(bl[1]).toBeCloseTo(corners[3][1], 10)
    })

    it('getCorners output should map back to correct UV', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4

      const corners: [Vec2, Vec2, Vec2, Vec2] = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]
      Rect.getCorners(position, size, rotateZ, corners)

      // Top-left corner should be UV (0,0)
      const uvTL = Rect.worldToUv(position, size, rotateZ, corners[0])
      expect(uvTL[0]).toBeCloseTo(0, 10)
      expect(uvTL[1]).toBeCloseTo(0, 10)

      // Top-right corner should be UV (1,0)
      const uvTR = Rect.worldToUv(position, size, rotateZ, corners[1])
      expect(uvTR[0]).toBeCloseTo(1, 10)
      expect(uvTR[1]).toBeCloseTo(0, 10)

      // Bottom-right corner should be UV (1,1)
      const uvBR = Rect.worldToUv(position, size, rotateZ, corners[2])
      expect(uvBR[0]).toBeCloseTo(1, 10)
      expect(uvBR[1]).toBeCloseTo(1, 10)

      // Bottom-left corner should be UV (0,1)
      const uvBL = Rect.worldToUv(position, size, rotateZ, corners[3])
      expect(uvBL[0]).toBeCloseTo(0, 10)
      expect(uvBL[1]).toBeCloseTo(1, 10)
    })
  })

  describe('debug: value inspection', () => {
    it('should show intermediate values for debugging', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4

      // Test a known point
      const originalUv: Vec2 = [0.25, 0.75]
      const world = Rect.uvToWorld(position, size, rotateZ, originalUv)
      const roundTrip = Rect.worldToUv(position, size, rotateZ, world)

      expect(roundTrip[0]).toBeCloseTo(originalUv[0], 10)
      expect(roundTrip[1]).toBeCloseTo(originalUv[1], 10)
    })
  })

  describe('potential issues: input mutation', () => {
    it('uvToWorld should NOT mutate input UV', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const uv: Vec2 = [0.25, 0.75]
      const originalU = uv[0]
      const originalV = uv[1]

      Rect.uvToWorld(position, size, rotateZ, uv)

      expect(uv[0]).toBe(originalU)
      expect(uv[1]).toBe(originalV)
    })

    it('worldToUv should NOT mutate input world coords', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const world: Vec2 = [120, 210]
      const originalX = world[0]
      const originalY = world[1]

      Rect.worldToUv(position, size, rotateZ, world)

      expect(world[0]).toBe(originalX)
      expect(world[1]).toBe(originalY)
    })

    it('uvToWorld should NOT mutate position or size', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const origPosX = position[0]
      const origPosY = position[1]
      const origSizeX = size[0]
      const origSizeY = size[1]

      Rect.uvToWorld(position, size, rotateZ, [0.5, 0.5])

      expect(position[0]).toBe(origPosX)
      expect(position[1]).toBe(origPosY)
      expect(size[0]).toBe(origSizeX)
      expect(size[1]).toBe(origSizeY)
    })

    it('worldToUv should NOT mutate position or size', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const origPosX = position[0]
      const origPosY = position[1]
      const origSizeX = size[0]
      const origSizeY = size[1]

      Rect.worldToUv(position, size, rotateZ, [120, 210])

      expect(position[0]).toBe(origPosX)
      expect(position[1]).toBe(origPosY)
      expect(size[0]).toBe(origSizeX)
      expect(size[1]).toBe(origSizeY)
    })
  })

  describe('potential issues: extreme values', () => {
    it('should handle very small sizes', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [0.001, 0.001]
      const rotateZ = 0
      const uv: Vec2 = [0.5, 0.5]

      const world = Rect.uvToWorld(position, size, rotateZ, uv)
      const roundTrip = Rect.worldToUv(position, size, rotateZ, world)

      expect(roundTrip[0]).toBeCloseTo(uv[0], 5)
      expect(roundTrip[1]).toBeCloseTo(uv[1], 5)
    })

    it('should handle very large sizes', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [10000, 10000]
      const rotateZ = Math.PI / 3
      const uv: Vec2 = [0.25, 0.75]

      const world = Rect.uvToWorld(position, size, rotateZ, uv)
      const roundTrip = Rect.worldToUv(position, size, rotateZ, world)

      expect(roundTrip[0]).toBeCloseTo(uv[0], 10)
      expect(roundTrip[1]).toBeCloseTo(uv[1], 10)
    })

    it('should handle UV values outside 0-1 range', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0
      const uv: Vec2 = [-0.5, 1.5] // outside rect bounds

      const world = Rect.uvToWorld(position, size, rotateZ, uv)
      const roundTrip = Rect.worldToUv(position, size, rotateZ, world)

      expect(roundTrip[0]).toBeCloseTo(uv[0], 10)
      expect(roundTrip[1]).toBeCloseTo(uv[1], 10)
    })

    it('should handle non-uniform scale (wide rect)', () => {
      const position: Vec2 = [0, 0]
      const size: Vec2 = [1000, 10] // very wide
      const rotateZ = Math.PI / 6
      const uv: Vec2 = [0.1, 0.9]

      const world = Rect.uvToWorld(position, size, rotateZ, uv)
      const roundTrip = Rect.worldToUv(position, size, rotateZ, world)

      expect(roundTrip[0]).toBeCloseTo(uv[0], 10)
      expect(roundTrip[1]).toBeCloseTo(uv[1], 10)
    })

    it('should handle non-uniform scale (tall rect)', () => {
      const position: Vec2 = [0, 0]
      const size: Vec2 = [10, 1000] // very tall
      const rotateZ = Math.PI / 6
      const uv: Vec2 = [0.1, 0.9]

      const world = Rect.uvToWorld(position, size, rotateZ, uv)
      const roundTrip = Rect.worldToUv(position, size, rotateZ, world)

      expect(roundTrip[0]).toBeCloseTo(uv[0], 10)
      expect(roundTrip[1]).toBeCloseTo(uv[1], 10)
    })
  })

  describe('consistency with containsPoint', () => {
    it('points inside rect (UV 0-1) should be contained', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4

      // UV (0.5, 0.5) is center - should definitely be inside
      const center = Rect.uvToWorld(position, size, rotateZ, [0.5, 0.5])
      expect(Rect.containsPoint(position, size, rotateZ, center)).toBe(true)

      // UV (0.1, 0.1) should be inside
      const nearTL = Rect.uvToWorld(position, size, rotateZ, [0.1, 0.1])
      expect(Rect.containsPoint(position, size, rotateZ, nearTL)).toBe(true)

      // UV (0.9, 0.9) should be inside
      const nearBR = Rect.uvToWorld(position, size, rotateZ, [0.9, 0.9])
      expect(Rect.containsPoint(position, size, rotateZ, nearBR)).toBe(true)
    })

    it('containsPoint has boundary precision issue (documents bug)', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4

      // Get the actual corners from getCorners for reference
      const corners: [Vec2, Vec2, Vec2, Vec2] = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]
      Rect.getCorners(position, size, rotateZ, corners)

      // Corners from uvToWorld
      const tl = Rect.uvToWorld(position, size, rotateZ, [0, 0])

      // uvToWorld produces the same result as getCorners (this is correct!)
      expect(tl[0]).toBeCloseTo(corners[0][0], 10)
      expect(tl[1]).toBeCloseTo(corners[0][1], 10)

      // BUG: containsPoint returns false for boundary points due to floating-point precision
      // This is a bug in containsPoint, NOT in uvToWorld/worldToUv
      // Even getCorners output fails containsPoint!
      expect(Rect.containsPoint(position, size, rotateZ, corners[0])).toBe(false) // documents the bug

      // Points slightly inside work fine
      const nearTL = Rect.uvToWorld(position, size, rotateZ, [0.001, 0.001])
      expect(Rect.containsPoint(position, size, rotateZ, nearTL)).toBe(true)
    })

    it('points outside rect (UV outside 0-1) should NOT be contained', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4

      // Well outside
      const outside1 = Rect.uvToWorld(position, size, rotateZ, [-0.5, 0.5])
      expect(Rect.containsPoint(position, size, rotateZ, outside1)).toBe(false)

      const outside2 = Rect.uvToWorld(position, size, rotateZ, [1.5, 0.5])
      expect(Rect.containsPoint(position, size, rotateZ, outside2)).toBe(false)

      const outside3 = Rect.uvToWorld(position, size, rotateZ, [0.5, -0.5])
      expect(Rect.containsPoint(position, size, rotateZ, outside3)).toBe(false)

      const outside4 = Rect.uvToWorld(position, size, rotateZ, [0.5, 1.5])
      expect(Rect.containsPoint(position, size, rotateZ, outside4)).toBe(false)
    })
  })

  describe('getUvToWorldMatrix', () => {
    it('should produce same results as uvToWorld for unrotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = 0
      const matrix: Mat2 = [1, 0, 0, 1, 0, 0]

      Rect.getUvToWorldMatrix(position, size, rotateZ, matrix)

      // Test multiple UV points
      const uvPoints: Vec2[] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [0.5, 0.5],
        [0.25, 0.75],
      ]

      for (const uv of uvPoints) {
        const expected = Rect.uvToWorld(position, size, rotateZ, uv)
        const point: Vec2 = [uv[0], uv[1]]
        Mat2.transformPoint(matrix, point)

        expect(point[0]).toBeCloseTo(expected[0], 10)
        expect(point[1]).toBeCloseTo(expected[1], 10)
      }
    })

    it('should produce same results as uvToWorld for 45-degree rotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const matrix: Mat2 = [1, 0, 0, 1, 0, 0]

      Rect.getUvToWorldMatrix(position, size, rotateZ, matrix)

      const uvPoints: Vec2[] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [0.5, 0.5],
        [0.25, 0.75],
      ]

      for (const uv of uvPoints) {
        const expected = Rect.uvToWorld(position, size, rotateZ, uv)
        const point: Vec2 = [uv[0], uv[1]]
        Mat2.transformPoint(matrix, point)

        expect(point[0]).toBeCloseTo(expected[0], 10)
        expect(point[1]).toBeCloseTo(expected[1], 10)
      }
    })

    it('should produce same results as uvToWorld for 90-degree rotated rect', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 2
      const matrix: Mat2 = [1, 0, 0, 1, 0, 0]

      Rect.getUvToWorldMatrix(position, size, rotateZ, matrix)

      const uvPoints: Vec2[] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [0.5, 0.5],
      ]

      for (const uv of uvPoints) {
        const expected = Rect.uvToWorld(position, size, rotateZ, uv)
        const point: Vec2 = [uv[0], uv[1]]
        Mat2.transformPoint(matrix, point)

        expect(point[0]).toBeCloseTo(expected[0], 10)
        expect(point[1]).toBeCloseTo(expected[1], 10)
      }
    })

    it('should handle non-square rect with rotation', () => {
      const position: Vec2 = [0, 0]
      const size: Vec2 = [200, 50] // wide rect
      const rotateZ = Math.PI / 6 // 30 degrees
      const matrix: Mat2 = [1, 0, 0, 1, 0, 0]

      Rect.getUvToWorldMatrix(position, size, rotateZ, matrix)

      const uvPoints: Vec2[] = [
        [0, 0],
        [1, 1],
        [0.2, 0.8],
      ]

      for (const uv of uvPoints) {
        const expected = Rect.uvToWorld(position, size, rotateZ, uv)
        const point: Vec2 = [uv[0], uv[1]]
        Mat2.transformPoint(matrix, point)

        expect(point[0]).toBeCloseTo(expected[0], 10)
        expect(point[1]).toBeCloseTo(expected[1], 10)
      }
    })

    it('should map corners correctly', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const matrix: Mat2 = [1, 0, 0, 1, 0, 0]

      Rect.getUvToWorldMatrix(position, size, rotateZ, matrix)

      const corners: [Vec2, Vec2, Vec2, Vec2] = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]
      Rect.getCorners(position, size, rotateZ, corners)

      // UV (0,0) should map to top-left corner
      const tl: Vec2 = [0, 0]
      Mat2.transformPoint(matrix, tl)
      expect(tl[0]).toBeCloseTo(corners[0][0], 10)
      expect(tl[1]).toBeCloseTo(corners[0][1], 10)

      // UV (1,0) should map to top-right corner
      const tr: Vec2 = [1, 0]
      Mat2.transformPoint(matrix, tr)
      expect(tr[0]).toBeCloseTo(corners[1][0], 10)
      expect(tr[1]).toBeCloseTo(corners[1][1], 10)

      // UV (1,1) should map to bottom-right corner
      const br: Vec2 = [1, 1]
      Mat2.transformPoint(matrix, br)
      expect(br[0]).toBeCloseTo(corners[2][0], 10)
      expect(br[1]).toBeCloseTo(corners[2][1], 10)

      // UV (0,1) should map to bottom-left corner
      const bl: Vec2 = [0, 1]
      Mat2.transformPoint(matrix, bl)
      expect(bl[0]).toBeCloseTo(corners[3][0], 10)
      expect(bl[1]).toBeCloseTo(corners[3][1], 10)
    })

    it('should not mutate position or size', () => {
      const position: Vec2 = [100, 200]
      const size: Vec2 = [50, 30]
      const rotateZ = Math.PI / 4
      const matrix: Mat2 = [1, 0, 0, 1, 0, 0]
      const origPosX = position[0]
      const origPosY = position[1]
      const origSizeX = size[0]
      const origSizeY = size[1]

      Rect.getUvToWorldMatrix(position, size, rotateZ, matrix)

      expect(position[0]).toBe(origPosX)
      expect(position[1]).toBe(origPosY)
      expect(size[0]).toBe(origSizeX)
      expect(size[1]).toBe(origSizeY)
    })
  })
})
