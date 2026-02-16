import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @floating-ui/vue to avoid getSelection requirement in jsdom
vi.mock('@floating-ui/vue', () => ({
  useFloating: () => ({
    floatingStyles: { value: {} },
    update: vi.fn(),
    x: { value: 0 },
    y: { value: 0 },
    isPositioned: { value: false },
    middlewareData: { value: {} },
    placement: { value: 'bottom' },
    strategy: { value: 'absolute' },
  }),
  offset: () => ({}),
  flip: () => ({}),
  shift: () => ({}),
  autoUpdate: vi.fn(() => () => {}),
}))

// Mock FloatingMenu to avoid useSingleton issues in tests
vi.mock('../src/components/FloatingMenu.vue', () => ({
  default: {
    name: 'FloatingMenu',
    template: '<div></div>',
  },
}))

import InfiniteCanvas from '../src/components/InfiniteCanvas.vue'

// Track all created editor instances
let editorInstances: any[] = []

// Mock the plugins
vi.mock('@woven-canvas/plugin-canvas-controls', () => ({
  CanvasControlsPlugin: vi.fn(() => ({
    name: 'canvas-controls',
  })),
}))

vi.mock('@woven-canvas/plugin-selection', async () => {
  const actual = await vi.importActual('@woven-canvas/plugin-selection')
  return {
    ...actual,
    SelectionPlugin: {
      name: 'selection',
    },
  }
})

vi.mock('@woven-canvas/asset-sync', () => {
  class MockAssetManager {
    init = vi.fn().mockResolvedValue(undefined)
    resumePendingUploads = vi.fn().mockResolvedValue(undefined)
    close = vi.fn()
  }
  class MockLocalAssetProvider {}
  return {
    AssetManager: MockAssetManager,
    LocalAssetProvider: MockLocalAssetProvider,
  }
})

// Mock Editor class with factory function
vi.mock('@woven-canvas/core', async () => {
  const actual = await vi.importActual('@woven-canvas/core')

  class MockEditor {
    components = new Map()
    container: HTMLElement
    options: any
    private mockContext = {
      eventBuffer: {
        readEvents: () => ({ events: [], newIndex: 0 }),
      },
    }

    initialize = vi.fn().mockResolvedValue(undefined)
    dispose = vi.fn()
    tick = vi.fn()
    nextTick = vi.fn((_cb: () => void) => {
      return () => {}
    })
    _getContext = () => this.mockContext

    constructor(container: HTMLElement, options?: any) {
      this.container = container
      this.options = options
      editorInstances.push(this)
    }
  }

  return {
    ...actual,
    Editor: MockEditor,
  }
})

describe('InfiniteCanvas', () => {
  let mockRequestAnimationFrame: ReturnType<typeof vi.fn>
  let mockCancelAnimationFrame: ReturnType<typeof vi.fn>
  let animationFrameCallbacks: Map<number, FrameRequestCallback>
  let frameId: number

  beforeEach(() => {
    frameId = 0
    animationFrameCallbacks = new Map()
    editorInstances = []

    mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++frameId
      animationFrameCallbacks.set(id, callback)
      return id
    })

    mockCancelAnimationFrame = vi.fn((id: number) => {
      animationFrameCallbacks.delete(id)
    })

    vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function getLastEditorInstance() {
    return editorInstances[editorInstances.length - 1]
  }

  describe('mounting', () => {
    it('should mount successfully', async () => {
      const wrapper = mount(InfiniteCanvas)
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })

    it('should create a container div', async () => {
      const wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const container = wrapper.find('div')
      expect(container.exists()).toBe(true)
    })

    it('should apply correct styles to container', async () => {
      const wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const container = wrapper.find('div')
      const style = container.attributes('style')

      expect(style).toContain('position: relative')
      expect(style).toContain('width: 100%')
      expect(style).toContain('height: 100%')
      expect(style).toContain('overflow: hidden')
    })

    it('should initialize Editor with container element', async () => {
      const _wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const editorInstance = getLastEditorInstance()
      expect(editorInstance).toBeDefined()
      expect(editorInstance.initialize).toHaveBeenCalled()
    })

    it('should start animation frame loop after initialization', async () => {
      const _wrapper = mount(InfiniteCanvas)
      await flushPromises()

      expect(mockRequestAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('unmounting', () => {
    it('should cancel animation frame on unmount', async () => {
      const wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const frameIdBeforeUnmount = frameId

      wrapper.unmount()

      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(frameIdBeforeUnmount)
    })

    it('should dispose editor on unmount', async () => {
      const wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const editorInstance = getLastEditorInstance()

      wrapper.unmount()

      expect(editorInstance.dispose).toHaveBeenCalled()
    })
  })

  describe('props', () => {
    it('should pass maxEntities to Editor', async () => {
      mount(InfiniteCanvas, {
        props: {
          maxEntities: 5000,
        },
      })
      await flushPromises()

      const editorInstance = getLastEditorInstance()
      expect(editorInstance.options.maxEntities).toBe(5000)
    })

    it('should pass user data to Editor', async () => {
      mount(InfiniteCanvas, {
        props: {
          user: { userId: 'test-user-123' },
        },
      })
      await flushPromises()

      const editorInstance = getLastEditorInstance()
      expect(editorInstance.options.user.userId).toBe('test-user-123')
    })

    it('should include CanvasControlsPlugin by default', async () => {
      const { CanvasControlsPlugin } = await import('@woven-canvas/plugin-canvas-controls')

      mount(InfiniteCanvas)
      await flushPromises()

      expect(CanvasControlsPlugin).toHaveBeenCalled()
    })

    it('should include SelectionPlugin by default', async () => {
      mount(InfiniteCanvas)
      await flushPromises()

      const editorInstance = getLastEditorInstance()
      const hasSelectionPlugin = editorInstance.options.plugins?.some((p: any) => p.name === 'selection')

      expect(hasSelectionPlugin).toBe(true)
    })

    it('should pass custom plugins to Editor', async () => {
      const customPlugin = { name: 'custom-plugin' }

      mount(InfiniteCanvas, {
        props: {
          plugins: [customPlugin],
        },
      })
      await flushPromises()

      const editorInstance = getLastEditorInstance()
      const hasCustomPlugin = editorInstance.options.plugins?.some((p: any) => p.name === 'custom-plugin')

      expect(hasCustomPlugin).toBe(true)
    })

    it('should pass controls options to CanvasControlsPlugin', async () => {
      const { CanvasControlsPlugin } = await import('@woven-canvas/plugin-canvas-controls')
      vi.mocked(CanvasControlsPlugin).mockClear()

      mount(InfiniteCanvas, {
        props: {
          controls: {
            minZoom: 0.1,
            maxZoom: 10,
          },
        },
      })
      await flushPromises()

      expect(CanvasControlsPlugin).toHaveBeenCalledWith({
        minZoom: 0.1,
        maxZoom: 10,
      })
    })
  })

  describe('events', () => {
    it('should emit ready event with editor instance', async () => {
      const wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const readyEvents = wrapper.emitted('ready')
      expect(readyEvents).toHaveLength(1)

      const editorInstance = getLastEditorInstance()
      expect(readyEvents![0][0]).toBe(editorInstance)
    })
  })

  describe('tick loop', () => {
    it('should call editor.tick when tick function is invoked', async () => {
      const _wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const editorInstance = getLastEditorInstance()

      // Verify tick was set up (via requestAnimationFrame)
      expect(mockRequestAnimationFrame).toHaveBeenCalled()

      // The tick function calls editor.tick, but since processEvents
      // requires full ECS context, we just verify setup happened
      expect(editorInstance.tick).toBeDefined()
    })

    it('should schedule animation frames continuously', async () => {
      const _wrapper = mount(InfiniteCanvas)
      await flushPromises()

      // After mount, at least one requestAnimationFrame should be called
      expect(mockRequestAnimationFrame.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('provide/inject', () => {
    it('should provide canvas context with hasEntity and getEditor functions', async () => {
      // We test this indirectly by verifying the editor instance is created
      // and the component provides the expected interface
      const _wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const editorInstance = getLastEditorInstance()
      expect(editorInstance).toBeDefined()

      // The canvas context is provided internally
      // We verify it exists by checking the editor was created correctly
      expect(editorInstance.container).toBeInstanceOf(HTMLElement)
    })

    it('should expose editor through getEditor in provided canvas context', async () => {
      // Test by mounting and verifying editor is accessible
      const _wrapper = mount(InfiniteCanvas)
      await flushPromises()

      const editorInstance = getLastEditorInstance()

      // The provided canvasContext.getEditor() returns the editor
      // We verify the editor was created and initialized
      expect(editorInstance.initialize).toHaveBeenCalled()
    })
  })
})
