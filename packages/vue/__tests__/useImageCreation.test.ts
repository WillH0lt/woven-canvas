import { Asset, Block, Editor, Grid, Image, Synced, UploadState } from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { useImageCreation } from '../src/composables/useImageCreation'
import { WOVEN_CANVAS_KEY, type WovenCanvasContext } from '../src/injection'

const { nextEditorTick } = vi.hoisted(() => ({ nextEditorTick: vi.fn() }))
vi.mock('../src/composables/useEditorContext', () => ({
  useEditorContext: () => ({ nextEditorTick }),
}))

describe('useImageCreation', () => {
  let editor: Editor
  let sourceWidth: number
  let sourceHeight: number

  beforeEach(async () => {
    sourceWidth = 3300
    sourceHeight = 2550
    editor = new Editor(document.createElement('div'))
    await editor.initialize()
    nextEditorTick.mockResolvedValue(editor._getContext())

    // Stub decoding only; creation uses the real ECS components and grid logic.
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = sourceWidth
        naturalHeight = sourceHeight
        onload?: () => void
        private source = ''
        get src() {
          return this.source
        }
        set src(value: string) {
          this.source = value
          queueMicrotask(() => this.onload?.())
        }
      },
    )
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL() {
          return 'blob:test-image'
        }
        static revokeObjectURL() {}
      },
    )
  })

  afterEach(async () => {
    await editor.dispose()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  async function createImage(maxSize?: number) {
    const app = createApp({})
    app.provide(WOVEN_CANVAS_KEY, {
      getAssetManager: () => null,
    } as WovenCanvasContext)
    const { createImageBlock } = app.runWithContext(useImageCreation)
    return createImageBlock(new File(['image'], 'background.png', { type: 'image/png' }), 517, 463, { maxSize })
  }

  it.each([true, false])('keeps a letter spread proportional with grid enabled=%s', async (enabled) => {
    const ctx = editor._getContext()
    Grid.write(ctx).enabled = enabled
    const id = await createImage()
    const block = Block.read(ctx, id)

    expect(block.size[0]).toBe(400)
    expect(block.size[1]).toBeCloseTo(309.0909090909091, 10)
    expect(block.size[1] * (3300 / block.size[0])).toBeCloseTo(2550, 10)
    if (enabled) {
      expect([...block.position]).toEqual([320, 300])
    } else {
      expect(block.position[0] + block.size[0] / 2).toBeCloseTo(517)
      expect(block.position[1] + block.size[1] / 2).toBeCloseTo(463)
    }
    expect(Image.read(ctx, id).width).toBe(3300)
    expect(Image.read(ctx, id).height).toBe(2550)
    expect(Image.read(ctx, id).alt).toBe('background.png')
    expect(Asset.read(ctx, id).uploadState).toBe(UploadState.Pending)
    expect(Synced.read(ctx, id).id).toBeTruthy()
  })

  it.each([
    { width: 2550, height: 3300, maxSize: 333 },
    { width: 7, height: 13, maxSize: 400 },
    { width: 3300, height: 1, maxSize: 400 },
  ])('preserves proportions and the size limit for $width × $height', async ({ width, height, maxSize }) => {
    sourceWidth = width
    sourceHeight = height
    const ctx = editor._getContext()
    Object.assign(Grid.write(ctx), { enabled: true, colWidth: 30, rowHeight: 17 })
    const id = await createImage(maxSize)
    const block = Block.read(ctx, id)

    expect(block.size[0] / block.size[1]).toBeCloseTo(width / height, 10)
    expect(Math.max(...block.size)).toBeCloseTo(Math.min(maxSize, Math.max(width, height)))
    expect(Math.min(...block.size)).toBeGreaterThan(0)
    expect(block.position[0] / 30).toBeCloseTo(Math.round(block.position[0] / 30))
    expect(block.position[1] / 17).toBeCloseTo(Math.round(block.position[1] / 17))
  })

  it('allows zero grid spacing without corrupting image dimensions', async () => {
    const ctx = editor._getContext()
    Object.assign(Grid.write(ctx), { enabled: true, colWidth: 0, rowHeight: 0 })
    const id = await createImage(3300)
    const block = Block.read(ctx, id)

    expect([...block.size]).toEqual([3300, 2550])
    expect([...block.position]).toEqual([517 - 1650, 463 - 1275])
  })
})
