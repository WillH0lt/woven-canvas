import {
  Block,
  Camera,
  Editor,
  type EditorResources,
  Grid,
  getResources,
  TransformBoxState,
  TransformBoxStateSingleton,
} from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock } from '../../core/__tests__/testUtils'
import { CanvasControlsPlugin, GlideState, ScrollState } from '../src'
import { ZoomState } from '../src/components'

describe('arrow-key nudging', () => {
  let editor: Editor
  let element: HTMLDivElement
  let now: number

  beforeEach(async () => {
    now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    element = document.createElement('div')
    document.body.appendChild(element)
    editor = new Editor(element, {
      grid: { enabled: false },
      plugins: [
        CanvasControlsPlugin({
          smoothScroll: { enabled: false },
          cameraBounds: { left: -1000, top: -1000, right: 1000, bottom: 1000 },
        }),
      ],
    })
    await editor.initialize()
    await editor.tick()
  })

  afterEach(async () => {
    await editor.dispose()
    element.remove()
    vi.restoreAllMocks()
  })

  async function press(code: string, options: KeyboardEventInit = {}, target: Element = element) {
    now += options.repeat ? 300 : 16
    const event = new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true, ...options })
    target.dispatchEvent(event)
    await editor.tick()
    return event
  }

  it('leaves core-only editors without nudging', async () => {
    await editor.dispose()
    const afterTeardown = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    element.dispatchEvent(afterTeardown)
    expect(afterTeardown.defaultPrevented).toBe(false)

    editor = new Editor(element, { grid: { enabled: false } })
    await editor.initialize()
    const emptySelectionEvent = await press('ArrowRight')
    expect(emptySelectionEvent.defaultPrevented).toBe(true)
    expect(Camera.read(editor._getContext()!).left).toBe(0)
    let id = 0
    editor.nextTick((ctx) => {
      id = createBlock(ctx, { selected: true, tag: 'shape' })
    })
    await editor.tick()
    await press('ArrowRight', { repeat: true })
    expect([...Block.read(editor._getContext()!, id).position]).toEqual([100, 100])
  })

  it('handles the first arrow after attaching a headless editor through shared input', async () => {
    await editor.dispose()
    editor = new Editor(null, { plugins: [CanvasControlsPlugin({ smoothScroll: { enabled: false } })] })
    await editor.initialize()
    editor.attachDom(element)
    await press('ArrowRight')
    await press('ArrowRight', { repeat: true })
    expect(Camera.read(editor._getContext()!).left).toBe(80)
  })

  it.each([
    ['ArrowLeft', -40, 0],
    ['ArrowRight', 40, 0],
    ['ArrowUp', 0, -40],
    ['ArrowDown', 0, 40],
  ])('pans an empty selection with %s and prevents page scrolling', async (key, x, y) => {
    const event = await press(key)
    const camera = Camera.read(editor._getContext()!)
    expect([camera.left, camera.top]).toEqual([x, y])
    expect(event.defaultPrevented).toBe(true)
  })

  it('uses screen pixels at different zoom levels, repeats, and takes larger steps with Shift', async () => {
    editor.nextTick((ctx) => {
      Camera.write(ctx).zoom = 2
    })
    await editor.tick()
    await press('ArrowRight')
    await press('ArrowRight', { repeat: true })
    expect(Camera.read(editor._getContext()!).left).toBe(40)
    await press('ArrowRight', { shiftKey: true, repeat: true })
    expect(Camera.read(editor._getContext()!).left).toBe(90)
    await editor.tick()
    expect(Camera.read(editor._getContext()!).left).toBe(90)
  })

  it.each([false, true])('combines held arrows across presses and repeats (selected: %s)', async (selected) => {
    let id = 0
    if (selected) {
      editor.nextTick((ctx) => {
        id = createBlock(ctx, { tag: 'shape', selected: true, position: [0, 0] })
      })
      await editor.tick()
    }
    const ctx = editor._getContext()!
    const position = () =>
      selected ? [...Block.read(ctx, id).position] : [Camera.read(ctx).left, Camera.read(ctx).top]
    const step = selected ? 1 : 40

    await press('ArrowUp')
    await press('ArrowLeft')
    expect(position()).toEqual([-step, -2 * step])
    await press('ArrowLeft', { repeat: true })
    expect(position()).toEqual([-2 * step, -3 * step])
    await editor.tick()
    expect(position()).toEqual([-2 * step, -3 * step])

    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }))
    await press('ArrowLeft', { repeat: true })
    expect(position()).toEqual([-3 * step, -3 * step])
    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }))
    await editor.tick()
    expect(position()).toEqual([-3 * step, -3 * step])
  })

  it('cancels opposite held arrows while allowing movement on the other axis', async () => {
    await press('ArrowLeft')
    await press('ArrowRight')
    await press('ArrowUp')
    const camera = Camera.read(editor._getContext()!)
    expect([camera.left, camera.top]).toEqual([-40, -40])
  })

  it.each([
    false,
    true,
  ])('changes held direction immediately without waiting for native repeats (selected: %s)', async (selected) => {
    let id = 0
    if (selected) {
      editor.nextTick((ctx) => {
        id = createBlock(ctx, { tag: 'shape', selected: true, position: [0, 0] })
        const grid = Grid.write(ctx)
        grid.enabled = true
        grid.colWidth = 20
        grid.rowHeight = 30
      })
      await editor.tick()
    }
    const ctx = editor._getContext()!
    const position = () =>
      selected ? [...Block.read(ctx, id).position] : [Camera.read(ctx).left, Camera.read(ctx).top]
    const x = selected ? 20 : 40
    const y = selected ? 30 : 40
    await press('ArrowLeft')
    now += 310
    await editor.tick()
    expect(position()).toEqual([-2 * x, 0])

    await press('ArrowUp')
    expect(position()).toEqual([-3 * x, -y])
    now += 34
    await editor.tick()
    expect(position()).toEqual([-4 * x, -2 * y])
    // Native repeat events must not add extra steps to the plugin's clock.
    element.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', repeat: true, bubbles: true }))
    now += 1
    await editor.tick()
    expect(position()).toEqual([-4 * x, -2 * y])
    now += 34
    await editor.tick()
    expect(position()).toEqual([-5 * x, -3 * y])

    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }))
    now += 34
    await editor.tick()
    expect(position()).toEqual([-5 * x, -4 * y])
    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }))
    now += 500
    await editor.tick()
    expect(position()).toEqual([-5 * x, -4 * y])
  })

  it('still nudges when an arrow is pressed and released between frames', async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }))
    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', bubbles: true }))
    await editor.tick()
    expect(Camera.read(editor._getContext()!).left).toBe(40)
  })

  it.each([
    ['ArrowLeft', -1, 0],
    ['ArrowRight', 1, 0],
    ['ArrowUp', 0, -1],
    ['ArrowDown', 0, 1],
  ])('moves the entire selection with %s, leaving the camera still', async (key, dx, dy) => {
    let first = 0
    let second = 0
    let untouched = 0
    editor.nextTick((ctx) => {
      first = createBlock(ctx, { tag: 'shape', selected: true, position: [100, 100] })
      second = createBlock(ctx, { tag: 'shape', selected: true, position: [300, 300] })
      untouched = createBlock(ctx, { position: [500, 500] })
      Camera.write(ctx).zoom = 2
    })
    await editor.tick()
    await editor.tick()
    await press(key)
    const ctx = editor._getContext()!
    expect([...Block.read(ctx, first).position]).toEqual([100 + dx, 100 + dy])
    expect([...Block.read(ctx, second).position]).toEqual([300 + dx, 300 + dy])
    expect([...Block.read(ctx, untouched).position]).toEqual([500, 500])
    expect([Camera.read(ctx).left, Camera.read(ctx).top]).toEqual([0, 0])
    const { transformBoxId } = TransformBoxStateSingleton.read(ctx)
    expect(transformBoxId).not.toBeNull()
    expect([...Block.read(ctx, transformBoxId!).position]).toEqual([100 + dx, 100 + dy])
  })

  it('uses the current grid spacing per axis for selection nudges, including diagonals and Shift', async () => {
    let first = 0
    let second = 0
    editor.nextTick((ctx) => {
      first = createBlock(ctx, { tag: 'shape', selected: true, position: [100, 100] })
      second = createBlock(ctx, { tag: 'shape', selected: true, position: [203, 207] })
      const grid = Grid.write(ctx)
      grid.enabled = true
      grid.colWidth = 20
      grid.rowHeight = 30
      Camera.write(ctx).zoom = 2
    })
    await editor.tick()
    await press('ArrowLeft')
    await press('ArrowUp')
    const ctx = editor._getContext()!
    expect([...Block.read(ctx, first).position]).toEqual([60, 70])
    expect([...Block.read(ctx, second).position]).toEqual([163, 177])
    await press('ArrowUp', { repeat: true, shiftKey: true })
    expect([...Block.read(ctx, first).position]).toEqual([-140, -230])
    expect([...Block.read(ctx, second).position]).toEqual([-37, -123])

    editor.nextTick((ctx) => {
      Grid.write(ctx).enabled = false
    })
    await press('ArrowUp', { repeat: true })
    expect([...Block.read(ctx, first).position]).toEqual([-141, -231])
    expect([Camera.read(ctx).left, Camera.read(ctx).top]).toEqual([0, 0])
  })

  it('keeps camera nudges in screen pixels when grid snapping is enabled', async () => {
    editor.nextTick((ctx) => {
      const grid = Grid.write(ctx)
      grid.enabled = true
      grid.colWidth = 20
      grid.rowHeight = 30
    })
    await press('ArrowRight')
    await press('ArrowDown')
    const camera = Camera.read(editor._getContext()!)
    expect([camera.left, camera.top]).toEqual([80, 40])
  })

  it('moves selected ancestors and descendants only once and supports Shift and repeat', async () => {
    let parent = 0
    let child = 0
    editor.nextTick((ctx) => {
      parent = createBlock(ctx, { tag: 'shape', selected: true, position: [100, 100] })
      const middle = createBlock(ctx, { position: [20, 20] })
      Block.write(ctx, middle).parentId = parent
      child = createBlock(ctx, { selected: true, position: [5, 5] })
      Block.write(ctx, child).parentId = middle
    })
    await editor.tick()
    await press('ArrowDown', { shiftKey: true })
    await press('ArrowDown', { shiftKey: true, repeat: true })
    const ctx = editor._getContext()!
    expect([...Block.read(ctx, parent).position]).toEqual([100, 120])
    expect([...Block.read(ctx, child).position]).toEqual([5, 5])
    expect(Block.getWorldPosition(ctx, child)).toEqual([125, 145])
  })

  it.each(['input', 'textarea', 'select', 'div'])('leaves arrow keys in editable %s elements alone', async (tag) => {
    const input = document.createElement(tag)
    if (tag === 'div') input.setAttribute('contenteditable', 'true')
    element.appendChild(input)
    const event = await press('ArrowDown', {}, input)
    expect(event.defaultPrevented).toBe(false)
    expect(Camera.read(editor._getContext()!).top).toBe(0)
  })

  it('ignores Ctrl, Cmd, and Alt arrow shortcuts', async () => {
    await press('ArrowRight', { ctrlKey: true })
    await press('ArrowRight', { metaKey: true })
    await press('ArrowRight', { altKey: true })
    expect(Camera.read(editor._getContext()!).left).toBe(0)
  })

  it('does not move the selection while editing a block', async () => {
    let id = 0
    editor.nextTick((ctx) => {
      id = createBlock(ctx, { selected: true })
    })
    await editor.tick()
    await editor.tick()
    editor.nextTick((ctx) => {
      TransformBoxStateSingleton.write(ctx).state = TransformBoxState.Editing
    })
    await press('ArrowRight')
    expect([...Block.read(editor._getContext()!, id).position]).toEqual([100, 100])
  })

  it('allows camera navigation in readonly mode without moving selected blocks', async () => {
    editor.nextTick((ctx) => {
      getResources<EditorResources>(ctx).readonly = true
    })
    await press('ArrowRight')
    expect(Camera.read(editor._getContext()!).left).toBe(40)
    let id = 0
    editor.nextTick((ctx) => {
      id = createBlock(ctx, { selected: true })
    })
    await editor.tick()
    await press('ArrowRight')
    expect([...Block.read(editor._getContext()!, id).position]).toEqual([100, 100])
    expect(Camera.read(editor._getContext()!).left).toBe(40)
  })

  it('clamps keyboard pans to camera bounds and cancels animation targets', async () => {
    editor.nextTick((ctx) => {
      Camera.write(ctx).left = 990
      const glide = GlideState.write(ctx)
      glide.active = true
      glide.targetLeft = 990
    })
    await press('ArrowRight')
    const ctx = editor._getContext()!
    expect(Camera.read(ctx).left).toBe(1000)
    expect(GlideState.read(ctx).active).toBe(false)
    expect(ScrollState.read(ctx).active).toBe(false)
    expect(ZoomState.read(ctx).active).toBe(false)
    await editor.tick()
    expect(Camera.read(ctx).left).toBe(1000)
  })
})
