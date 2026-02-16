import { Block, defineQuery, Editor, type EditorPlugin, hasComponent, Synced } from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AddEraserStrokePoint, CancelEraserStroke, CompleteEraserStroke, StartEraserStroke } from '../../src/commands'
import { Erased, EraserStroke } from '../../src/components'
import { PLUGIN_NAME } from '../../src/constants'
import { EraserStateSingleton } from '../../src/singletons'
import { updateEraserSystem } from '../../src/systems/updateEraserSystem'
import { createBlock, createBlockWithDiagonalHitGeometry, createMockElement } from '../testUtils'

// Query for eraser stroke entities
const eraserStrokeQuery = defineQuery((q) => q.with(EraserStroke))

// Query for erased entities
const _erasedQuery = defineQuery((q) => q.with(Erased))

// Query for synced blocks
const _syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced))

// Test plugin with eraser update system
// Note: Block, Aabb, Synced, HitGeometry, RankBounds, Intersect are provided by CorePlugin
const testPlugin: EditorPlugin = {
  name: PLUGIN_NAME,
  components: [EraserStroke, Erased],
  singletons: [EraserStateSingleton],
  systems: [updateEraserSystem],
}

describe('updateEraserSystem', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  beforeEach(async () => {
    domElement = createMockElement() as HTMLDivElement
    editor = new Editor(domElement, { plugins: [testPlugin] })
    await editor.initialize()
  })

  afterEach(async () => {
    if (editor) {
      await editor.dispose()
    }
    if (domElement?.parentNode) {
      domElement.parentNode.removeChild(domElement)
    }
  })

  describe('StartEraserStroke command', () => {
    it('should create an eraser stroke entity', async () => {
      let strokeCount = 0

      editor.command(StartEraserStroke, { worldPosition: [100, 100] })
      await editor.tick()

      editor.nextTick((ctx) => {
        strokeCount = eraserStrokeQuery.current(ctx).length
      })
      await editor.tick()

      expect(strokeCount).toBe(1)
    })

    it('should initialize stroke with first point', async () => {
      let pointCount = 0
      let firstPoint: [number, number] = [0, 0]

      editor.command(StartEraserStroke, { worldPosition: [50, 75] })
      await editor.tick()

      editor.nextTick((ctx) => {
        const strokes = eraserStrokeQuery.current(ctx)
        if (strokes.length > 0) {
          const stroke = EraserStroke.read(ctx, strokes[0])
          pointCount = stroke.pointCount
          firstPoint = [stroke.points[0], stroke.points[1]]
        }
      })
      await editor.tick()

      expect(pointCount).toBe(1)
      expect(firstPoint).toEqual([50, 75])
    })

    it('should store active stroke in state singleton', async () => {
      let activeStroke: number | null = null

      editor.command(StartEraserStroke, { worldPosition: [100, 100] })
      await editor.tick()

      editor.nextTick((ctx) => {
        const state = EraserStateSingleton.read(ctx)
        activeStroke = state.activeStroke
      })
      await editor.tick()

      expect(activeStroke).not.toBeNull()
    })
  })

  describe('AddEraserStrokePoint command', () => {
    it('should add points to active stroke', async () => {
      let pointCount = 0
      let strokeId: number | null = null

      editor.command(StartEraserStroke, { worldPosition: [0, 0] })
      await editor.tick()

      // Get the active stroke ID from the state singleton
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [50, 50],
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [100, 100],
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        const strokes = eraserStrokeQuery.current(ctx)
        if (strokes.length > 0) {
          const stroke = EraserStroke.read(ctx, strokes[0])
          pointCount = stroke.pointCount
        }
      })
      await editor.tick()

      expect(pointCount).toBe(3)
    })

    it('should mark intersecting blocks as erased', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let isErased = false

      // Create a block at position [100, 100] with size [50, 50]
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke and draw through the block
      editor.command(StartEraserStroke, { worldPosition: [90, 125] })
      await editor.tick()

      // Get the active stroke ID
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [160, 125],
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        isErased = hasComponent(ctx, blockId!, Erased)
      })
      await editor.tick()

      expect(isErased).toBe(true)
    })

    it('should not mark non-intersecting blocks as erased', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let isErased = false

      // Create a block far from the stroke
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [500, 500],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke far from the block
      editor.command(StartEraserStroke, { worldPosition: [0, 0] })
      await editor.tick()

      // Get the active stroke ID
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [100, 100],
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        isErased = hasComponent(ctx, blockId!, Erased)
      })
      await editor.tick()

      expect(isErased).toBe(false)
    })

    it('should use HitGeometry for precise intersection when available', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let isErased = false

      // Create block with diagonal hit geometry (from top-left corner to bottom-right corner)
      // Block at [100, 100] with size [100, 100] has diagonal from (100, 100) to (200, 200)
      editor.nextTick((ctx) => {
        blockId = createBlockWithDiagonalHitGeometry(ctx, {
          position: [100, 100],
          size: [100, 100],
          radius: 5,
        })
      })
      await editor.tick()

      // Draw horizontal stroke through the center that crosses the diagonal
      // This goes from left to right through the middle of the block at y=150
      editor.command(StartEraserStroke, { worldPosition: [80, 150] })
      await editor.tick()

      // Get the active stroke ID
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [220, 150],
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        isErased = hasComponent(ctx, blockId!, Erased)
      })
      await editor.tick()

      expect(isErased).toBe(true)
    })

    it('should skip intersection check for small movements', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let isErased = false

      // Create a block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke inside the block
      editor.command(StartEraserStroke, { worldPosition: [125, 125] })
      await editor.tick()

      // Get the active stroke ID
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      // Add point with very small movement (less than 1 pixel)
      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [125.5, 125.5],
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        isErased = hasComponent(ctx, blockId!, Erased)
      })
      await editor.tick()

      // Should not be erased because movement was too small
      expect(isErased).toBe(false)
    })
  })

  describe('CompleteEraserStroke command', () => {
    it('should delete all erased entities', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let blockExists = true

      // Create a block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke and intersect with block
      editor.command(StartEraserStroke, { worldPosition: [90, 125] })
      await editor.tick()

      // Get stroke ID before adding point
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [160, 125],
      })
      await editor.tick()

      // Complete the stroke
      editor.command(CompleteEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        // Entity is deleted, so check if it exists in the buffer
        blockExists = ctx.entityBuffer.has(blockId!)
      })
      await editor.tick()

      expect(blockExists).toBe(false)
    })

    it('should delete the stroke entity', async () => {
      let strokeCount = 0
      let strokeId: number | null = null

      editor.command(StartEraserStroke, { worldPosition: [100, 100] })
      await editor.tick()

      // Get stroke ID before completing
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(CompleteEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        strokeCount = eraserStrokeQuery.current(ctx).length
      })
      await editor.tick()

      expect(strokeCount).toBe(0)
    })

    it('should clear active stroke in state singleton', async () => {
      let activeStroke: number | null = 1 // non-null initial
      let strokeId: number | null = null

      editor.command(StartEraserStroke, { worldPosition: [100, 100] })
      await editor.tick()

      // Get stroke ID before completing
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(CompleteEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        const state = EraserStateSingleton.read(ctx)
        activeStroke = state.activeStroke
      })
      await editor.tick()

      expect(activeStroke).toBeNull()
    })

    it('should only delete entities erased by the current stroke', async () => {
      let block1Id: number | undefined
      let block2Id: number | undefined
      let strokeId: number | null = null
      let block1Exists = true
      let block2Exists = true

      // Create two blocks
      editor.nextTick((ctx) => {
        block1Id = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        })
        block2Id = createBlock(ctx, {
          position: [300, 300],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke and only intersect with block1
      editor.command(StartEraserStroke, { worldPosition: [90, 125] })
      await editor.tick()

      // Get stroke ID before adding point
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [160, 125],
      })
      await editor.tick()

      editor.command(CompleteEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        // block1 is deleted, so check entity buffer
        block1Exists = ctx.entityBuffer.has(block1Id!)
        // block2 should still exist with Block component
        block2Exists = hasComponent(ctx, block2Id!, Block)
      })
      await editor.tick()

      expect(block1Exists).toBe(false)
      expect(block2Exists).toBe(true)
    })
  })

  describe('CancelEraserStroke command', () => {
    it('should remove Erased component from marked entities', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let isErased = false

      // Create a block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke and intersect with block
      editor.command(StartEraserStroke, { worldPosition: [90, 125] })
      await editor.tick()

      // Get stroke ID before adding point
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [160, 125],
      })
      await editor.tick()

      // Cancel the stroke
      editor.command(CancelEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        isErased = hasComponent(ctx, blockId!, Erased)
      })
      await editor.tick()

      expect(isErased).toBe(false)
    })

    it('should NOT delete entities when cancelled', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let blockExists = false

      // Create a block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        })
      })
      await editor.tick()

      // Start stroke and intersect with block
      editor.command(StartEraserStroke, { worldPosition: [90, 125] })
      await editor.tick()

      // Get stroke ID before adding point
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [160, 125],
      })
      await editor.tick()

      // Cancel the stroke
      editor.command(CancelEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        blockExists = hasComponent(ctx, blockId!, Block)
      })
      await editor.tick()

      expect(blockExists).toBe(true)
    })

    it('should delete the stroke entity', async () => {
      let strokeCount = 0
      let strokeId: number | null = null

      editor.command(StartEraserStroke, { worldPosition: [100, 100] })
      await editor.tick()

      // Get stroke ID before cancelling
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(CancelEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        strokeCount = eraserStrokeQuery.current(ctx).length
      })
      await editor.tick()

      expect(strokeCount).toBe(0)
    })

    it('should clear active stroke in state singleton', async () => {
      let activeStroke: number | null = 1
      let strokeId: number | null = null

      editor.command(StartEraserStroke, { worldPosition: [100, 100] })
      await editor.tick()

      // Get stroke ID before cancelling
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(CancelEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        const state = EraserStateSingleton.read(ctx)
        activeStroke = state.activeStroke
      })
      await editor.tick()

      expect(activeStroke).toBeNull()
    })
  })

  describe('multiple blocks', () => {
    it('should erase multiple intersecting blocks', async () => {
      let block1Id: number | undefined
      let block2Id: number | undefined
      let block3Id: number | undefined
      let strokeId: number | null = null
      let block1Exists = true
      let block2Exists = true
      let block3Exists = true

      // Create three blocks in a row
      editor.nextTick((ctx) => {
        block1Id = createBlock(ctx, {
          position: [50, 100],
          size: [30, 30],
        })
        block2Id = createBlock(ctx, {
          position: [100, 100],
          size: [30, 30],
        })
        block3Id = createBlock(ctx, {
          position: [150, 100],
          size: [30, 30],
        })
      })
      await editor.tick()

      // Draw stroke through all three blocks
      editor.command(StartEraserStroke, { worldPosition: [40, 115] })
      await editor.tick()

      // Get stroke ID before adding point
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [190, 115],
      })
      await editor.tick()

      editor.command(CompleteEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        // All blocks are deleted, so check entity buffer
        block1Exists = ctx.entityBuffer.has(block1Id!)
        block2Exists = ctx.entityBuffer.has(block2Id!)
        block3Exists = ctx.entityBuffer.has(block3Id!)
      })
      await editor.tick()

      expect(block1Exists).toBe(false)
      expect(block2Exists).toBe(false)
      expect(block3Exists).toBe(false)
    })
  })

  describe('non-synced blocks', () => {
    it('should not erase blocks without Synced component', async () => {
      let blockId: number | undefined
      let strokeId: number | null = null
      let blockExists = true

      // Create a non-synced block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          synced: false,
        })
      })
      await editor.tick()

      // Start stroke and draw through the block
      editor.command(StartEraserStroke, { worldPosition: [90, 125] })
      await editor.tick()

      // Get stroke ID before adding point
      editor.nextTick((ctx) => {
        strokeId = EraserStateSingleton.read(ctx).activeStroke
      })
      await editor.tick()

      editor.command(AddEraserStrokePoint, {
        strokeId: strokeId!,
        worldPosition: [160, 125],
      })
      await editor.tick()

      editor.command(CompleteEraserStroke, { strokeId })
      await editor.tick()

      editor.nextTick((ctx) => {
        blockExists = hasComponent(ctx, blockId!, Block)
      })
      await editor.tick()

      // Non-synced block should NOT be erased
      expect(blockExists).toBe(true)
    })
  })
})
