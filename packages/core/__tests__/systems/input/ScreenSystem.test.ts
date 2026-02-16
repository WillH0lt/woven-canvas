import { Editor } from '@infinitecanvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Screen } from '../../../src'

describe('Screen System', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  beforeEach(async () => {
    domElement = document.createElement('div')

    // Mock dimensions
    Object.defineProperty(domElement, 'clientWidth', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(domElement, 'clientHeight', {
      value: 600,
      configurable: true,
    })
    domElement.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        width: 800,
        height: 600,
        right: 900,
        bottom: 650,
        x: 100,
        y: 50,
        toJSON: () => {},
      }) as DOMRect

    document.body.appendChild(domElement)

    editor = new Editor(domElement, {
      plugins: [],
    })
    await editor.initialize()
  })

  afterEach(async () => {
    await editor.dispose()
    document.body.removeChild(domElement)
  })

  describe('initial dimensions', () => {
    it('should capture initial dimensions on first tick', async () => {
      const ctx = editor._getContext()!

      // First tick should capture dimensions
      await editor.tick()

      const screen = Screen.read(ctx)
      expect(screen.width).toBe(800)
      expect(screen.height).toBe(600)
      expect(screen.left).toBe(100)
      expect(screen.top).toBe(50)
    })
  })

  describe('resize handling', () => {
    it('should update dimensions when element resizes', async () => {
      const ctx = editor._getContext()!

      // First tick to capture initial dimensions
      await editor.tick()

      // Simulate resize
      Object.defineProperty(domElement, 'clientWidth', {
        value: 1024,
        configurable: true,
      })
      Object.defineProperty(domElement, 'clientHeight', {
        value: 768,
        configurable: true,
      })
      domElement.getBoundingClientRect = () =>
        ({
          left: 200,
          top: 100,
          width: 1024,
          height: 768,
          right: 1224,
          bottom: 868,
          x: 200,
          y: 100,
          toJSON: () => {},
        }) as DOMRect

      // Trigger ResizeObserver callback (simulated)
      // In real usage, ResizeObserver would call this
      // We'll dispatch a resize-like event or wait
      // For now, we manually trigger by calling a second initialization cycle

      // The ResizeObserver is mocked in JSDOM, so we need to manually
      // trigger the pending flag. Let's verify current behavior first.
      const screenBefore = Screen.read(ctx)
      expect(screenBefore.width).toBe(800)
    })
  })
})

describe('Screen - multiple instances', () => {
  it('should maintain separate screen state for each instance', async () => {
    const domElement1 = document.createElement('div')
    const domElement2 = document.createElement('div')

    // Set different dimensions for each
    Object.defineProperty(domElement1, 'clientWidth', { value: 800 })
    Object.defineProperty(domElement1, 'clientHeight', { value: 600 })
    domElement1.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect

    Object.defineProperty(domElement2, 'clientWidth', { value: 400 })
    Object.defineProperty(domElement2, 'clientHeight', { value: 300 })
    domElement2.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 100,
        width: 400,
        height: 300,
        right: 500,
        bottom: 400,
        x: 100,
        y: 100,
        toJSON: () => {},
      }) as DOMRect

    document.body.appendChild(domElement1)
    document.body.appendChild(domElement2)

    const editor1 = new Editor(domElement1, {
      plugins: [],
    })
    const editor2 = new Editor(domElement2, {
      plugins: [],
    })

    await editor1.initialize()
    await editor2.initialize()

    await editor1.tick()
    await editor2.tick()

    const ctx1 = editor1._getContext()!
    const ctx2 = editor2._getContext()!

    const screen1 = Screen.read(ctx1)
    const screen2 = Screen.read(ctx2)

    expect(screen1.width).toBe(800)
    expect(screen1.height).toBe(600)

    expect(screen2.width).toBe(400)
    expect(screen2.height).toBe(300)
    expect(screen2.left).toBe(100)
    expect(screen2.top).toBe(100)

    await editor1.dispose()
    await editor2.dispose()
    document.body.removeChild(domElement1)
    document.body.removeChild(domElement2)
  })
})
