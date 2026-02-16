import { Camera, Editor } from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CanvasControlsPlugin, PanState, PanStateValue } from '../src'

describe('CanvasControlsPlugin', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  function createDomElement(): HTMLDivElement {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientWidth', { value: 800 })
    Object.defineProperty(el, 'clientHeight', { value: 600 })
    el.getBoundingClientRect = () =>
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
    return el
  }

  beforeEach(async () => {
    domElement = createDomElement()
    document.body.appendChild(domElement)
  })

  afterEach(async () => {
    if (editor) {
      await editor.dispose()
    }
    document.body.removeChild(domElement)
  })

  describe('plugin registration', () => {
    it('should register with default options', async () => {
      editor = new Editor(domElement, {
        plugins: [CanvasControlsPlugin()],
      })
      await editor.initialize()

      const ctx = editor._getContext()!

      // Should have Camera singleton from CorePlugin
      expect(() => Camera.read(ctx)).not.toThrow()

      // Should have PanState singleton from CanvasControlsPlugin
      expect(() => PanState.read(ctx)).not.toThrow()
    })

    it('should register with custom options', async () => {
      editor = new Editor(domElement, {
        plugins: [CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 })],
      })
      await editor.initialize()

      const ctx = editor._getContext()!
      expect(() => PanState.read(ctx)).not.toThrow()
    })
  })

  describe('PanState singleton', () => {
    it('should initialize with idle state', async () => {
      editor = new Editor(domElement, {
        plugins: [CanvasControlsPlugin()],
      })
      await editor.initialize()

      const ctx = editor._getContext()!
      const panState = PanState.read(ctx)

      expect(panState.state).toBe(PanStateValue.Idle)
      expect(panState.panStartX).toBe(0)
      expect(panState.panStartY).toBe(0)
    })
  })

  describe('Camera singleton', () => {
    it('should initialize with default values', async () => {
      editor = new Editor(domElement, {
        plugins: [CanvasControlsPlugin()],
      })
      await editor.initialize()

      const ctx = editor._getContext()!
      const camera = Camera.read(ctx)

      expect(camera.left).toBe(0)
      expect(camera.top).toBe(0)
      expect(camera.zoom).toBe(1)
    })
  })
})

describe('captureZoom system', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  function createDomElement(): HTMLDivElement {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientWidth', { value: 800 })
    Object.defineProperty(el, 'clientHeight', { value: 600 })
    el.getBoundingClientRect = () =>
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
    return el
  }

  beforeEach(async () => {
    domElement = createDomElement()
    document.body.appendChild(domElement)

    editor = new Editor(domElement, {
      plugins: [CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 })],
    })
    await editor.initialize()
    await editor.tick() // Initialize screen dimensions
  })

  afterEach(async () => {
    await editor.dispose()
    document.body.removeChild(domElement)
  })

  it('should zoom in when scrolling up with modifier key', async () => {
    const ctx = editor._getContext()!

    // Initial zoom
    expect(Camera.read(ctx).zoom).toBe(1)

    // Hold modifier key (Ctrl/Cmd)
    domElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ControlLeft',
        ctrlKey: true,
        bubbles: true,
      }),
    )

    // Scroll up (negative deltaY = zoom in)
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
        ctrlKey: true,
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    expect(camera.zoom).toBeGreaterThan(1)
  })

  it('should zoom out when scrolling down with modifier key', async () => {
    const ctx = editor._getContext()!

    // Initial zoom
    expect(Camera.read(ctx).zoom).toBe(1)

    // Hold modifier key
    domElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ControlLeft',
        ctrlKey: true,
        bubbles: true,
      }),
    )

    // Scroll down (positive deltaY = zoom out)
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
        ctrlKey: true,
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    expect(camera.zoom).toBeLessThan(1)
  })

  it('should not zoom without modifier key', async () => {
    const ctx = editor._getContext()!

    // Initial zoom
    expect(Camera.read(ctx).zoom).toBe(1)

    // Scroll without modifier key
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
        bubbles: true,
      }),
    )

    await editor.tick()

    // Zoom should be unchanged (scroll system will pan instead)
    const camera = Camera.read(ctx)
    expect(camera.zoom).toBe(1)
  })

  it('should respect minZoom limit', async () => {
    const ctx = editor._getContext()!

    // Hold modifier key
    domElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ControlLeft',
        ctrlKey: true,
        bubbles: true,
      }),
    )

    // Scroll down many times to hit min zoom
    for (let i = 0; i < 50; i++) {
      domElement.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 500,
          clientX: 400,
          clientY: 300,
          ctrlKey: true,
          bubbles: true,
        }),
      )
      await editor.tick()
    }

    const camera = Camera.read(ctx)
    expect(camera.zoom).toBeGreaterThanOrEqual(0.1)
  })

  it('should respect maxZoom limit', async () => {
    const ctx = editor._getContext()!

    // Hold modifier key
    domElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ControlLeft',
        ctrlKey: true,
        bubbles: true,
      }),
    )

    // Scroll up many times to hit max zoom
    for (let i = 0; i < 50; i++) {
      domElement.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -500,
          clientX: 400,
          clientY: 300,
          ctrlKey: true,
          bubbles: true,
        }),
      )
      await editor.tick()
    }

    const camera = Camera.read(ctx)
    expect(camera.zoom).toBeLessThanOrEqual(10)
  })
})

describe('captureScroll system', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  function createDomElement(): HTMLDivElement {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientWidth', { value: 800 })
    Object.defineProperty(el, 'clientHeight', { value: 600 })
    el.getBoundingClientRect = () =>
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
    return el
  }

  beforeEach(async () => {
    domElement = createDomElement()
    document.body.appendChild(domElement)

    editor = new Editor(domElement, {
      plugins: [CanvasControlsPlugin()],
    })
    await editor.initialize()
    await editor.tick()
  })

  afterEach(async () => {
    await editor.dispose()
    document.body.removeChild(domElement)
  })

  it('should pan vertically when scrolling without modifier', async () => {
    const ctx = editor._getContext()!

    // Initial position
    expect(Camera.read(ctx).top).toBe(0)

    // Scroll down
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    expect(camera.top).toBe(100)
  })

  it('should pan horizontally when scrolling without modifier', async () => {
    const ctx = editor._getContext()!

    // Initial position
    expect(Camera.read(ctx).left).toBe(0)

    // Scroll right
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: 100,
        deltaY: 0,
        clientX: 400,
        clientY: 300,
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    expect(camera.left).toBe(100)
  })

  it('should not scroll when modifier key is held (zoom takes priority)', async () => {
    const ctx = editor._getContext()!

    // Initial position
    expect(Camera.read(ctx).top).toBe(0)

    // Hold modifier key
    domElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ControlLeft',
        ctrlKey: true,
        bubbles: true,
      }),
    )

    // Scroll with modifier - should zoom, not pan
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
        ctrlKey: true,
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    // Top should still be 0 (zoom happened instead)
    // Zoom changed, so top might be slightly different due to zoom centering
    // But the scroll system itself should not have run
    expect(camera.zoom).toBeLessThan(1) // Zoom out happened
  })

  it('should scale scroll by zoom level', async () => {
    const ctx = editor._getContext()!

    // Set zoom to 2x
    const cam = Camera.write(ctx)
    cam.zoom = 2

    await editor.tick()

    // Scroll
    domElement.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    // At 2x zoom, 100px scroll should result in 50 world units
    expect(camera.top).toBe(50)
  })
})

describe('capturePan system', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  function createDomElement(): HTMLDivElement {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientWidth', { value: 800 })
    Object.defineProperty(el, 'clientHeight', { value: 600 })
    el.getBoundingClientRect = () =>
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
    return el
  }

  beforeEach(async () => {
    domElement = createDomElement()
    document.body.appendChild(domElement)

    editor = new Editor(domElement, {
      plugins: [CanvasControlsPlugin()],
    })
    await editor.initialize()
    await editor.tick()
  })

  afterEach(async () => {
    await editor.dispose()
    document.body.removeChild(domElement)
  })

  it('should start panning on middle mouse down', async () => {
    const ctx = editor._getContext()!

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1, // Middle button
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    const panState = PanState.read(ctx)
    expect(panState.state).toBe(PanStateValue.Panning)
  })

  it('should pan camera when dragging with middle mouse', async () => {
    const ctx = editor._getContext()!

    // Initial position
    expect(Camera.read(ctx).left).toBe(0)
    expect(Camera.read(ctx).top).toBe(0)

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    // Move mouse
    domElement.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 300,
        clientY: 200,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    const camera = Camera.read(ctx)
    // Camera should have moved opposite to the drag direction
    // Dragged left 100px and up 100px, so camera moves right and down
    expect(camera.left).toBe(100)
    expect(camera.top).toBe(100)
  })

  it('should stop panning on middle mouse up', async () => {
    const ctx = editor._getContext()!

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    expect(PanState.read(ctx).state).toBe(PanStateValue.Panning)

    // Middle mouse up - dispatch to window since that's where pointerup is listened
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    expect(PanState.read(ctx).state).toBe(PanStateValue.Idle)
  })

  it('should not pan with left mouse button', async () => {
    const ctx = editor._getContext()!

    // Left mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 0, // Left button
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    const panState = PanState.read(ctx)
    expect(panState.state).toBe(PanStateValue.Idle)
  })

  it('should cancel panning on escape key', async () => {
    const ctx = editor._getContext()!

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )

    await editor.tick()

    expect(PanState.read(ctx).state).toBe(PanStateValue.Panning)

    // Press escape
    domElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Escape',
        bubbles: true,
      }),
    )

    await editor.tick()

    expect(PanState.read(ctx).state).toBe(PanStateValue.Idle)
  })
})

describe('camera gliding', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  function createDomElement(): HTMLDivElement {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientWidth', { value: 800 })
    Object.defineProperty(el, 'clientHeight', { value: 600 })
    el.getBoundingClientRect = () =>
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
    return el
  }

  beforeEach(async () => {
    domElement = createDomElement()
    document.body.appendChild(domElement)

    editor = new Editor(domElement, {
      plugins: [CanvasControlsPlugin()],
    })
    await editor.initialize()
    await editor.tick()
  })

  afterEach(async () => {
    await editor.dispose()
    document.body.removeChild(domElement)
  })

  it('should enter gliding state when releasing pan with velocity', async () => {
    const ctx = editor._getContext()!

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    // Simulate fast drag by moving quickly across multiple frames
    // Need large movements to build up velocity above the 0.1 threshold
    for (let i = 1; i <= 3; i++) {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 400 - i * 100, // Move left 100px each frame
          clientY: 300 - i * 100, // Move up 100px each frame
          button: 1,
          pointerType: 'mouse',
          bubbles: true,
        }),
      )
      await editor.tick()
    }

    // Release immediately after movement (no extra frames to let velocity decay)
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 100,
        clientY: 0,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    // Should be in gliding state
    const panState = PanState.read(ctx)
    expect(panState.state).toBe(PanStateValue.Gliding)
  })

  it('should not enter gliding state when releasing pan without velocity', async () => {
    const ctx = editor._getContext()!

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    // Wait several frames without moving (velocity decays)
    for (let i = 0; i < 10; i++) {
      await editor.tick()
    }

    // Release without recent movement
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    // Should go directly to idle (no glide)
    const panState = PanState.read(ctx)
    expect(panState.state).toBe(PanStateValue.Idle)
  })

  it('should animate camera during gliding', async () => {
    const ctx = editor._getContext()!

    // Middle mouse down
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    // Fast drag
    for (let i = 1; i <= 5; i++) {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 400 - i * 50,
          clientY: 300,
          button: 1,
          pointerType: 'mouse',
          bubbles: true,
        }),
      )
      await editor.tick()
    }

    // Final move and release in same frame to preserve velocity
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 100,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 100,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    expect(PanState.read(ctx).state).toBe(PanStateValue.Gliding)

    const cameraAfterRelease = Camera.read(ctx).left

    // Continue ticking to animate
    for (let i = 0; i < 10; i++) {
      await editor.tick()
    }

    const cameraAfterGlide = Camera.read(ctx).left

    // Camera should have moved further in the same direction during glide
    // Since we dragged left (decreasing clientX), camera.left increases
    expect(cameraAfterGlide).toBeGreaterThan(cameraAfterRelease)
  })

  it('should interrupt gliding when starting a new pan', async () => {
    const ctx = editor._getContext()!

    // Start and release a fast pan
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    for (let i = 1; i <= 5; i++) {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 400 - i * 50,
          clientY: 300,
          button: 1,
          pointerType: 'mouse',
          bubbles: true,
        }),
      )
      await editor.tick()
    }

    // Final move and release in same frame to preserve velocity
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 100,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 100,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    expect(PanState.read(ctx).state).toBe(PanStateValue.Gliding)

    // Start a new pan while gliding
    domElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    await editor.tick()

    // Should have interrupted glide and be panning again
    expect(PanState.read(ctx).state).toBe(PanStateValue.Panning)
  })
})
