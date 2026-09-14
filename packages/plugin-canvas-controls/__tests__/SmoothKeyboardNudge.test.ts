import { Block, Camera, Editor } from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock } from '../../core/__tests__/testUtils'
import { CanvasControlsPlugin, ScrollState } from '../src'
import { CameraNudgeState } from '../src/components/CameraNudgeState'

describe('smooth keyboard camera motion', () => {
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
      plugins: [CanvasControlsPlugin({ cameraBounds: { left: -1000, top: -1000, right: 1000, bottom: 1000 } })],
    })
    await editor.initialize()
    await frame()
  })

  afterEach(async () => {
    await editor.dispose()
    element.remove()
    vi.restoreAllMocks()
  })

  async function frame() {
    now += 16
    await editor.tick()
  }

  async function press(code: string, options: KeyboardEventInit = {}) {
    if (options.repeat) now += 300
    element.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, ...options }))
    await frame()
  }

  async function settle() {
    for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      element.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
    }
    for (let i = 0; i < 120 && CameraNudgeState.read(editor._getContext()!).active; i++) await frame()
    expect(CameraNudgeState.read(editor._getContext()!).active).toBe(false)
  }

  it('eases toward accumulated diagonal targets, preserves velocity on repeat, and settles exactly', async () => {
    const ctx = editor._getContext()!
    await press('ArrowUp')
    await press('ArrowLeft')
    expect(Camera.read(ctx).top).toBeLessThan(0)
    expect(Camera.read(ctx).top).toBeGreaterThan(-40)
    await press('ArrowLeft', { repeat: true })
    expect(CameraNudgeState.read(ctx).targetLeft).toBe(-80)
    expect(CameraNudgeState.read(ctx).targetTop).toBe(-120)
    expect(CameraNudgeState.read(ctx).velocityX).toBeLessThan(0)
    expect(CameraNudgeState.read(ctx).velocityY).toBeLessThan(0)
    expect(Camera.read(ctx).left).toBeGreaterThan(-80)

    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }))
    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }))
    await settle()
    expect([Camera.read(ctx).left, Camera.read(ctx).top]).toEqual([-80, -120])
  })

  it('keeps Shift steps in screen pixels at different zoom levels', async () => {
    const ctx = editor._getContext()!
    editor.nextTick((ctx) => {
      Camera.write(ctx).zoom = 2
    })
    await press('ArrowRight')
    await press('ShiftLeft', { shiftKey: true })
    await press('ArrowRight', { repeat: true, shiftKey: true })
    expect(CameraNudgeState.read(ctx).targetLeft).toBe(70)
    await settle()
    expect(Camera.read(ctx).left).toBe(70)
  })

  it('clamps the target so repeated nudges at a boundary do not accumulate excess travel', async () => {
    const ctx = editor._getContext()!
    editor.nextTick((ctx) => {
      Camera.write(ctx).left = 990
    })
    await press('ArrowRight')
    await press('ArrowRight', { repeat: true })
    expect(CameraNudgeState.read(ctx).targetLeft).toBe(1000)
    await settle()
    expect(Camera.read(ctx).left).toBe(1000)
    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', bubbles: true }))
    await press('ArrowLeft')
    expect(CameraNudgeState.read(ctx).targetLeft).toBe(960)
    await settle()
    expect(Camera.read(ctx).left).toBe(960)
  })

  it('stops camera easing when a selection is made and nudges that selection immediately', async () => {
    const ctx = editor._getContext()!
    await press('ArrowRight')
    await frame()
    const left = Camera.read(ctx).left
    let id = 0
    editor.nextTick((ctx) => {
      id = createBlock(ctx, { selected: true, tag: 'shape' })
    })
    await frame()
    await press('ArrowRight', { repeat: true })
    expect(Camera.read(ctx).left).toBe(left)
    expect(CameraNudgeState.read(ctx).active).toBe(false)
    expect([...Block.read(ctx, id).position]).toEqual([101, 100])
  })

  it('cancels keyboard easing on other keyboard shortcuts', async () => {
    const ctx = editor._getContext()!
    await press('ArrowRight')
    await frame()
    const left = Camera.read(ctx).left
    await press('ControlLeft', { ctrlKey: true })
    await frame()
    expect(CameraNudgeState.read(ctx).active).toBe(false)
    expect(Camera.read(ctx).left).toBe(left)
  })

  it('hands camera motion to wheel scrolling without carrying over its keyboard target', async () => {
    const ctx = editor._getContext()!
    await press('ArrowRight')
    const left = Camera.read(ctx).left
    expect(ScrollState.read(ctx).active).toBe(false)
    element.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', bubbles: true }))
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true }))
    await frame()
    expect(CameraNudgeState.read(ctx).active).toBe(false)
    expect(ScrollState.read(ctx).active).toBe(true)
    expect(ScrollState.read(ctx).targetLeft).toBe(left)
    for (let i = 0; i < 120 && ScrollState.read(ctx).active; i++) await frame()
    expect([Camera.read(ctx).left, Camera.read(ctx).top]).toEqual([left, 80])
  })

  it('starts easing diagonally on the second key press and continues before native repeat resumes', async () => {
    const ctx = editor._getContext()!
    await press('ArrowLeft')
    now += 300
    await frame()
    const left = Camera.read(ctx).left
    await press('ArrowUp')
    expect(Camera.read(ctx).left).toBeLessThan(left)
    expect(Camera.read(ctx).top).toBeLessThan(0)
    const targetTop = CameraNudgeState.read(ctx).targetTop
    const top = Camera.read(ctx).top
    for (let i = 0; i < 3; i++) await frame()
    expect(Camera.read(ctx).top).toBeLessThan(top)
    expect(CameraNudgeState.read(ctx).targetTop).toBeLessThan(targetTop)
  })

  it('stops easing when the camera is moved by another control', async () => {
    const ctx = editor._getContext()!
    await press('ArrowRight')
    editor.nextTick((ctx) => {
      const camera = Camera.write(ctx)
      camera.left = 300
      camera.top = 200
    })
    await frame()
    expect(CameraNudgeState.read(ctx).active).toBe(false)
    expect([Camera.read(ctx).left, Camera.read(ctx).top]).toEqual([300, 200])
  })
})
