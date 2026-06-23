import { Editor, type EditorPlugin } from '@woven-canvas/core'
import { addComponent, createEntity } from '@woven-ecs/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Aabb, Block, Frame, Layer } from '../../src/components'
import { intersectAabb, intersectPoint } from '../../src/helpers/intersect'
import { createBlock, createMockElement } from '../testUtils'

// Mock DOM element for tests
const mockDomElement = createMockElement()

// Minimal plugin that registers Block, Aabb, Frame, and Layer components
const TestPlugin: EditorPlugin = {
  name: 'test',
  components: [Block, Aabb, Frame, Layer],
}

describe('intersectAabb', () => {
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

  describe('basic intersection', () => {
    it('should detect intersection when selection box fully contains block', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [50, 50],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Selection box that fully contains the block
        result = intersectAabb(ctx, [0, 0, 200, 200])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })

    it('should detect intersection when selection box overlaps block corner', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Selection box overlaps bottom-right corner
        result = intersectAabb(ctx, [150, 150, 250, 250])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })

    it('should not detect intersection when selection box is completely outside', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Selection box completely outside
        result = intersectAabb(ctx, [200, 200, 300, 300])
      })

      await editor.tick()
      expect(result.length).toBe(0)
    })
  })

  describe('narrow AABB through middle (edge-to-edge intersection)', () => {
    it('should detect narrow horizontal selection passing through block center', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Block at (0, 0) to (100, 100)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Thin horizontal selection from (-10, 45) to (110, 55)
        // Passes through the middle of the block without touching corners
        result = intersectAabb(ctx, [-10, 45, 110, 55])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })

    it('should detect narrow vertical selection passing through block center', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Block at (0, 0) to (100, 100)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Thin vertical selection from (45, -10) to (55, 110)
        // Passes through the middle of the block without touching corners
        result = intersectAabb(ctx, [45, -10, 55, 110])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })

    it('should detect cross-shaped selection passing through block', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Block at (100, 100) to (200, 200)
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Thin selection cutting through from left to right
        result = intersectAabb(ctx, [50, 145, 250, 155])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })

    it('should not detect narrow selection that misses the block', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Block at (0, 0) to (100, 100)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Thin horizontal selection above the block
        result = intersectAabb(ctx, [-10, -20, 110, -10])
      })

      await editor.tick()
      expect(result.length).toBe(0)
    })
  })

  describe('rotated blocks', () => {
    it('should detect narrow selection passing through rotated block', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Block at (0, 0) with 45 degree rotation
        // Center is at (50, 50)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: Math.PI / 4, // 45 degrees
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Thin horizontal selection through center
        // The rotated block extends beyond (-20, -20) to (120, 120) approximately
        result = intersectAabb(ctx, [-50, 45, 150, 55])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })

    it('should detect diagonal selection through rotated block', async () => {
      let blockId: number = 0
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Block at (50, 50) with 45 degree rotation
        blockId = createBlock(ctx, {
          position: [50, 50],
          size: [100, 100],
          rotateZ: Math.PI / 4,
          synced: false,
        })
        Aabb.expandByBlock(ctx, blockId, blockId)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Selection that passes through the rotated block diagonally
        result = intersectAabb(ctx, [95, 95, 105, 105])
      })

      await editor.tick()
      expect(result.length).toBe(1)
    })
  })

  describe('multiple blocks', () => {
    it('should detect all blocks that a narrow selection passes through', async () => {
      let result: number[] = []

      editor.nextTick((ctx) => {
        // Create three blocks in a row
        const block1 = createBlock(ctx, {
          position: [0, 0],
          size: [50, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, block1, block1)

        const block2 = createBlock(ctx, {
          position: [100, 0],
          size: [50, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, block2, block2)

        const block3 = createBlock(ctx, {
          position: [200, 0],
          size: [50, 100],
          synced: false,
        })
        Aabb.expandByBlock(ctx, block3, block3)
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        // Thin horizontal selection that passes through all three
        result = intersectAabb(ctx, [-10, 45, 260, 55])
      })

      await editor.tick()
      expect(result.length).toBe(3)
    })
  })

  describe('frame clipping', () => {
    /**
     * Helper to create a frame entity (Block + Frame components) with an AABB.
     */
    function createFrame(
      ctx: ReturnType<typeof editor.getContext>,
      options: { position: [number, number]; size: [number, number] },
    ) {
      const entityId = createBlock(ctx, { ...options, synced: false })
      addComponent(ctx, entityId, Frame, { label: 'Frame' })
      return entityId
    }

    /**
     * Helper to create a child block parented to a frame, with position
     * specified in local coordinates relative to the parent.
     */
    function createChildBlock(
      ctx: ReturnType<typeof editor.getContext>,
      parentId: number,
      options: { position: [number, number]; size: [number, number] },
    ) {
      const entityId = createBlock(ctx, { ...options, synced: false })
      const block = Block.write(ctx, entityId)
      block.parentId = parentId
      // Recompute AABB since parent changed
      Aabb.setByPoints(ctx, entityId, Block.getCorners(ctx, entityId))
      return entityId
    }

    describe('intersectPoint', () => {
      it('should intersect a child block at a point inside the frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          // Frame at (0,0) size 200x200
          const frameId = createFrame(ctx, { position: [0, 0], size: [200, 200] })
          // Child fully inside frame at local (50,50) size 100x100
          childId = createChildBlock(ctx, frameId, { position: [50, 50], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Point inside both the child and the frame
          result = intersectPoint(ctx, [100, 100])
        })

        await editor.tick()
        expect(result).toContain(childId)
      })

      it('should not intersect a child block at a point outside the frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          // Frame at (0,0) size 200x200
          const frameId = createFrame(ctx, { position: [0, 0], size: [200, 200] })
          // Child extends outside frame: local position (150,150) size 100x100
          // World bounds: (150,150) to (250,250) — partially outside frame
          childId = createChildBlock(ctx, frameId, { position: [150, 150], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Point at (220, 220) — inside the child's geometry but outside the frame
          result = intersectPoint(ctx, [220, 220])
        })

        await editor.tick()
        // Child should be clipped — point is outside frame bounds
        expect(result).not.toContain(childId)
      })

      it('should intersect a child at the visible portion inside the frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          // Frame at (0,0) size 200x200
          const frameId = createFrame(ctx, { position: [0, 0], size: [200, 200] })
          // Child extends outside: local (150,150) size 100x100
          childId = createChildBlock(ctx, frameId, { position: [150, 150], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Point at (175, 175) — inside both the child and the frame
          result = intersectPoint(ctx, [175, 175])
        })

        await editor.tick()
        expect(result).toContain(childId)
      })

      it('should handle nested frames', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          // Outer frame at (0,0) size 300x300
          const outerFrameId = createFrame(ctx, { position: [0, 0], size: [300, 300] })
          // Inner frame at local (50,50) size 200x200 — world (50,50) to (250,250)
          const innerFrameId = createChildBlock(ctx, outerFrameId, { position: [50, 50], size: [200, 200] })
          addComponent(ctx, innerFrameId, Frame, { label: 'Inner' })
          // Child at inner-local (150,150) size 100x100 — world (200,200) to (300,300)
          // Clipped by inner frame to (200,200)-(250,250)
          childId = createChildBlock(ctx, innerFrameId, { position: [150, 150], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Point at (270, 270) — inside child geometry but outside inner frame
          result = intersectPoint(ctx, [270, 270])
        })

        await editor.tick()
        expect(result).not.toContain(childId)
      })
    })

    describe('intersectAabb', () => {
      it('should intersect a child block when selection is inside the frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          const frameId = createFrame(ctx, { position: [0, 0], size: [200, 200] })
          childId = createChildBlock(ctx, frameId, { position: [50, 50], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Selection fully inside frame, overlapping child
          result = intersectAabb(ctx, [60, 60, 140, 140])
        })

        await editor.tick()
        expect(result).toContain(childId)
      })

      it('should not intersect a child block when selection is outside the frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          const frameId = createFrame(ctx, { position: [0, 0], size: [200, 200] })
          // Child extends outside: world (150,150) to (250,250)
          childId = createChildBlock(ctx, frameId, { position: [150, 150], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Selection at (210,210)-(240,240) — overlaps child but not the frame
          result = intersectAabb(ctx, [210, 210, 240, 240])
        })

        await editor.tick()
        expect(result).not.toContain(childId)
      })

      it('should intersect a child block when selection overlaps both child and frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          const frameId = createFrame(ctx, { position: [0, 0], size: [200, 200] })
          // Child extends outside: world (150,150) to (250,250)
          childId = createChildBlock(ctx, frameId, { position: [150, 150], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Selection at (160,160)-(220,220) — overlaps both child and frame
          result = intersectAabb(ctx, [160, 160, 220, 220])
        })

        await editor.tick()
        expect(result).toContain(childId)
      })

      it('should not intersect children of nested frames when selection misses inner frame', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          const outerFrameId = createFrame(ctx, { position: [0, 0], size: [300, 300] })
          const innerFrameId = createChildBlock(ctx, outerFrameId, { position: [50, 50], size: [200, 200] })
          addComponent(ctx, innerFrameId, Frame, { label: 'Inner' })
          // Child world pos: (200,200) to (300,300), clipped by inner frame (50,50)-(250,250)
          childId = createChildBlock(ctx, innerFrameId, { position: [150, 150], size: [100, 100] })
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Selection at (260,260)-(290,290) — inside outer frame but outside inner frame
          result = intersectAabb(ctx, [260, 260, 290, 290])
        })

        await editor.tick()
        expect(result).not.toContain(childId)
      })
    })

    describe('layer visibility', () => {
      /** Create a Layer entity, optionally hidden/locked. */
      function createLayer(
        ctx: ReturnType<typeof editor.getContext>,
        options: { hidden?: boolean; locked?: boolean } = {},
      ) {
        const entityId = createEntity(ctx)
        addComponent(ctx, entityId, Layer, { hidden: options.hidden ?? false, locked: options.locked ?? false })
        return entityId
      }

      it('intersects a block on a visible layer', async () => {
        let blockId = 0
        let result: number[] = []

        editor.nextTick((ctx) => {
          blockId = createBlock(ctx, { position: [0, 0], size: [100, 100], synced: false })
          Aabb.expandByBlock(ctx, blockId, blockId)
          Block.write(ctx, blockId).layerId = createLayer(ctx)
        })

        await editor.tick()
        editor.nextTick((ctx) => {
          result = intersectPoint(ctx, [50, 50])
        })

        await editor.tick()
        expect(result).toContain(blockId)
      })

      it('excludes a block on a hidden layer from point hit-testing', async () => {
        let blockId = 0
        let result: number[] = []

        editor.nextTick((ctx) => {
          blockId = createBlock(ctx, { position: [0, 0], size: [100, 100], synced: false })
          Aabb.expandByBlock(ctx, blockId, blockId)
          Block.write(ctx, blockId).layerId = createLayer(ctx, { hidden: true })
        })

        await editor.tick()
        editor.nextTick((ctx) => {
          result = intersectPoint(ctx, [50, 50])
        })

        await editor.tick()
        expect(result).not.toContain(blockId)
      })

      it('excludes a block on a locked layer from point hit-testing', async () => {
        let blockId = 0
        let result: number[] = []

        editor.nextTick((ctx) => {
          blockId = createBlock(ctx, { position: [0, 0], size: [100, 100], synced: false })
          Aabb.expandByBlock(ctx, blockId, blockId)
          Block.write(ctx, blockId).layerId = createLayer(ctx, { locked: true })
        })

        await editor.tick()
        editor.nextTick((ctx) => {
          result = intersectPoint(ctx, [50, 50])
        })

        await editor.tick()
        expect(result).not.toContain(blockId)
      })

      it('excludes a block on a hidden layer from marquee (AABB) selection', async () => {
        let blockId = 0
        let result: number[] = []

        editor.nextTick((ctx) => {
          blockId = createBlock(ctx, { position: [0, 0], size: [100, 100], synced: false })
          Aabb.expandByBlock(ctx, blockId, blockId)
          Block.write(ctx, blockId).layerId = createLayer(ctx, { hidden: true })
        })

        await editor.tick()
        editor.nextTick((ctx) => {
          result = intersectAabb(ctx, [-10, -10, 200, 200])
        })

        await editor.tick()
        expect(result).not.toContain(blockId)
      })
    })

    describe('non-frame parents', () => {
      it('should not clip children of non-frame parents', async () => {
        let result: number[] = []
        let childId = 0

        editor.nextTick((ctx) => {
          // Parent is a regular block, not a frame
          const parentId = createBlock(ctx, { position: [0, 0], size: [200, 200], synced: false })
          // Child extends outside parent: world (150,150) to (350,350)
          childId = createBlock(ctx, { position: [150, 150], size: [200, 200], synced: false })
          const block = Block.write(ctx, childId)
          block.parentId = parentId
          Aabb.setByPoints(ctx, childId, Block.getCorners(ctx, childId))
        })

        await editor.tick()

        editor.nextTick((ctx) => {
          // Point outside parent but inside child — should still intersect
          // because parent is not a frame (no clipping)
          result = intersectPoint(ctx, [300, 300])
        })

        await editor.tick()
        expect(result).toContain(childId)
      })
    })
  })
})
