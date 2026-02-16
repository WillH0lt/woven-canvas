import type { Vec2 } from '@infinitecanvas/math'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addComponent, Block, createEntity, Editor, type EditorPlugin } from '../../src'

// Mock DOM element for tests
const mockDomElement = document.createElement('div')

// Minimal plugin that registers Block component
const TestPlugin: EditorPlugin = {
  name: 'test',
  components: [Block],
}

describe('Block', () => {
  let editor: Editor

  beforeEach(async () => {
    editor = new Editor(mockDomElement, { plugins: [TestPlugin] })
    await editor.initialize()
  })

  afterEach(async () => {
    if (editor) {
      await editor.dispose()
    }
  })

  describe('getCenter', () => {
    it('should return center point of block', async () => {
      let center: Vec2 | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 50

        center = Block.getCenter(ctx, eid)
      })

      await editor.tick()
      expect(center).toEqual([50, 25])
    })

    it('should work with negative positions', async () => {
      let center: Vec2 | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = -50
        block.position[1] = -50
        block.size[0] = 100
        block.size[1] = 100

        center = Block.getCenter(ctx, eid)
      })

      await editor.tick()
      expect(center).toEqual([0, 0])
    })
  })

  describe('setCenter', () => {
    it('should adjust position to center block at given point', async () => {
      let position: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.size[0] = 100
        block.size[1] = 50

        Block.setCenter(ctx, eid, [100, 100])

        position = [...Block.read(ctx, eid).position]
      })

      await editor.tick()
      expect(position).toEqual([50, 75])
    })
  })

  describe('getCorners', () => {
    it('should return four corner points for unrotated block', async () => {
      let corners: [Vec2, Vec2, Vec2, Vec2] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 50
        block.rotateZ = 0

        corners = Block.getCorners(ctx, eid)
      })

      await editor.tick()
      expect(corners).toEqual([
        [0, 0], // top-left
        [100, 0], // top-right
        [100, 50], // bottom-right
        [0, 50], // bottom-left
      ])
    })

    it('should return rotated corners for 90 degree rotation', async () => {
      let corners: [Vec2, Vec2, Vec2, Vec2] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = -25
        block.position[1] = -25
        block.size[0] = 50
        block.size[1] = 50
        block.rotateZ = Math.PI / 2 // 90 degrees

        corners = Block.getCorners(ctx, eid)
      })

      await editor.tick()
      // 90 degree rotation around center (0,0) for a 50x50 block
      // Corners should be rotated 90 degrees clockwise
      expect(corners![0][0]).toBeCloseTo(25)
      expect(corners![0][1]).toBeCloseTo(-25)
      expect(corners![1][0]).toBeCloseTo(25)
      expect(corners![1][1]).toBeCloseTo(25)
      expect(corners![2][0]).toBeCloseTo(-25)
      expect(corners![2][1]).toBeCloseTo(25)
      expect(corners![3][0]).toBeCloseTo(-25)
      expect(corners![3][1]).toBeCloseTo(-25)
    })
  })

  describe('containsPoint', () => {
    it('should return true when point is inside unrotated block', async () => {
      let result: boolean | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100

        result = Block.containsPoint(ctx, eid, [50, 50])
      })

      await editor.tick()
      expect(result).toBe(true)
    })

    it('should return false when point is outside unrotated block', async () => {
      let result: boolean | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100

        result = Block.containsPoint(ctx, eid, [150, 150])
      })

      await editor.tick()
      expect(result).toBe(false)
    })

    it('should correctly test point against rotated block', async () => {
      let insideResult: boolean | undefined
      let outsideResult: boolean | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        // Create a 100x100 block centered at (50, 50)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100
        block.rotateZ = Math.PI / 4 // 45 degrees

        // Center should still be inside
        insideResult = Block.containsPoint(ctx, eid, [50, 50])
        // Corner of original unrotated block should now be outside
        outsideResult = Block.containsPoint(ctx, eid, [0, 0])
      })

      await editor.tick()
      expect(insideResult).toBe(true)
      expect(outsideResult).toBe(false)
    })
  })

  describe('translate', () => {
    it('should move block by delta', async () => {
      let position: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 10
        block.position[1] = 20

        Block.translate(ctx, eid, [5, -10])

        position = [...Block.read(ctx, eid).position]
      })

      await editor.tick()
      expect(position).toEqual([15, 10])
    })
  })

  describe('setPosition', () => {
    it('should set block position', async () => {
      let position: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)

        Block.setPosition(ctx, eid, [100, 200])

        position = [...Block.read(ctx, eid).position]
      })

      await editor.tick()
      expect(position).toEqual([100, 200])
    })
  })

  describe('setSize', () => {
    it('should set block size', async () => {
      let size: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)

        Block.setSize(ctx, eid, [200, 150])

        size = [...Block.read(ctx, eid).size]
      })

      await editor.tick()
      expect(size).toEqual([200, 150])
    })
  })

  describe('rotateBy', () => {
    it('should rotate block by delta angle', async () => {
      let rotateZ: number | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.rotateZ = Math.PI / 4

        Block.rotateBy(ctx, eid, Math.PI / 4)

        rotateZ = Block.read(ctx, eid).rotateZ
      })

      await editor.tick()
      expect(rotateZ).toBeCloseTo(Math.PI / 2)
    })
  })

  describe('rotateAround', () => {
    it('should rotate block around a pivot point', async () => {
      let position: number[] | undefined
      let rotateZ: number | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        // 100x100 block at origin
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100
        block.rotateZ = 0

        // Rotate 90 degrees around point (100, 50) which is the right-center
        Block.rotateAround(ctx, eid, [100, 50], Math.PI / 2)

        position = [...Block.read(ctx, eid).position]
        rotateZ = Block.read(ctx, eid).rotateZ
      })

      await editor.tick()
      // Center of block was at (50, 50), after 90 degree rotation around (100, 50)
      // new center should be at (100, 0)
      // so position should be (50, -50)
      expect(position![0]).toBeCloseTo(50)
      expect(position![1]).toBeCloseTo(-50)
      expect(rotateZ).toBeCloseTo(Math.PI / 2)
    })
  })

  describe('scaleBy', () => {
    it('should scale block uniformly around center', async () => {
      let position: number[] | undefined
      let size: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100

        Block.scaleBy(ctx, eid, 2)

        position = [...Block.read(ctx, eid).position]
        size = [...Block.read(ctx, eid).size]
      })

      await editor.tick()
      // Center stays at (50, 50), size doubles to 200x200
      // So position should be (50 - 100, 50 - 100) = (-50, -50)
      expect(position).toEqual([-50, -50])
      expect(size).toEqual([200, 200])
    })

    it('should shrink block with scale factor < 1', async () => {
      let position: number[] | undefined
      let size: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100

        Block.scaleBy(ctx, eid, 0.5)

        position = [...Block.read(ctx, eid).position]
        size = [...Block.read(ctx, eid).size]
      })

      await editor.tick()
      // Center stays at (50, 50), size halves to 50x50
      // So position should be (50 - 25, 50 - 25) = (25, 25)
      expect(position).toEqual([25, 25])
      expect(size).toEqual([50, 50])
    })
  })

  describe('scaleAround', () => {
    it('should scale block around a pivot point', async () => {
      let position: number[] | undefined
      let size: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 0
        block.position[1] = 0
        block.size[0] = 100
        block.size[1] = 100

        // Scale 2x around origin (0, 0)
        Block.scaleAround(ctx, eid, [0, 0], 2)

        position = [...Block.read(ctx, eid).position]
        size = [...Block.read(ctx, eid).size]
      })

      await editor.tick()
      // Center was at (50, 50), scaled 2x from origin becomes (100, 100)
      // Size doubles to 200x200
      // Position is center - half size = (100 - 100, 100 - 100) = (0, 0)
      expect(position).toEqual([0, 0])
      expect(size).toEqual([200, 200])
    })

    it('should scale block toward pivot when shrinking', async () => {
      let position: number[] | undefined
      let size: number[] | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.write(ctx, eid)
        block.position[0] = 100
        block.position[1] = 100
        block.size[0] = 100
        block.size[1] = 100

        // Scale 0.5x around origin (0, 0)
        Block.scaleAround(ctx, eid, [0, 0], 0.5)

        position = [...Block.read(ctx, eid).position]
        size = [...Block.read(ctx, eid).size]
      })

      await editor.tick()
      // Center was at (150, 150), scaled 0.5x from origin becomes (75, 75)
      // Size halves to 50x50
      // Position is center - half size = (75 - 25, 75 - 25) = (50, 50)
      expect(position).toEqual([50, 50])
      expect(size).toEqual([50, 50])
    })
  })

  describe('default values', () => {
    it('should have correct default values', async () => {
      let tag: string | undefined
      let position: number[] | undefined
      let size: number[] | undefined
      let rotateZ: number | undefined
      let rank: string | undefined

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx)
        addComponent(ctx, eid, Block)
        const block = Block.read(ctx, eid)
        tag = block.tag
        position = [...block.position]
        size = [...block.size]
        rotateZ = block.rotateZ
        rank = block.rank
      })

      await editor.tick()
      expect(tag).toBe('div')
      expect(position).toEqual([0, 0])
      expect(size).toEqual([100, 100])
      expect(rotateZ).toBe(0)
      expect(rank).toBe('')
    })
  })
})
