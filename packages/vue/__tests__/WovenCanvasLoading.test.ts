import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

// Loading overlay shows until the document has loaded: while connected and
// awaiting the first `synced` signal it stays up; it clears on the first sync,
// immediately for a local-only store, or when we go offline (work offline).

// --- Mocks (mirror WovenCanvas.test.ts) ---------------------------------------

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

vi.mock('../src/components/FloatingMenu.vue', () => ({
  default: { name: 'FloatingMenu', template: '<div></div>' },
}))
vi.mock('../src/components/Toolbar.vue', () => ({
  default: { name: 'Toolbar', template: '<div></div>' },
}))

vi.mock('@woven-canvas/plugin-canvas-controls', () => ({
  CanvasControlsPlugin: vi.fn(() => ({ name: 'canvas-controls' })),
}))

vi.mock('@woven-canvas/asset-sync', () => {
  class MockAssetManager {
    init = vi.fn().mockResolvedValue(undefined)
    resumePendingUploads = vi.fn().mockResolvedValue(undefined)
    close = vi.fn()
    onUploadStart = vi.fn(() => () => {})
    onUploadComplete = vi.fn(() => () => {})
    onUploadError = vi.fn(() => () => {})
  }
  return { AssetManager: MockAssetManager, LocalAssetProvider: class {} }
})

vi.mock('@woven-canvas/core', async () => {
  const actual = await vi.importActual('@woven-canvas/core')
  class MockEditor {
    components = new Map()
    singletons = new Map()
    container: HTMLElement
    options: any
    initialize = vi.fn().mockResolvedValue(undefined)
    dispose = vi.fn()
    tick = vi.fn()
    nextTick = vi.fn(() => () => {})
    constructor(container: HTMLElement, options?: any) {
      this.container = container
      this.options = options
    }
  }
  return { ...actual, Editor: MockEditor }
})

// Mock CanvasStore so the test can drive sync/connectivity callbacks directly.
// The class lives inside the (hoisted) factory; `storeHolder` exposes the last
// instance to the tests.
const storeHolder = vi.hoisted(() => ({ last: null as any }))
vi.mock('@woven-ecs/canvas-store', async () => {
  const actual = await vi.importActual('@woven-ecs/canvas-store')
  class MockStore {
    options: any
    // A local-only store (no websocket) is synced immediately, like the real one.
    private _isSynced: boolean
    initialize = vi.fn().mockResolvedValue(undefined)
    sync = vi.fn()
    close = vi.fn()
    connect = vi.fn().mockResolvedValue(undefined)
    disconnect = vi.fn()
    setToken = vi.fn()
    getState = vi.fn(() => ({}))
    undo = vi.fn()
    redo = vi.fn()
    canUndo = vi.fn(() => false)
    canRedo = vi.fn(() => false)
    onSettled = vi.fn()

    constructor(options: any) {
      this.options = options
      this._isSynced = !options?.websocket
      storeHolder.last = this
    }

    get isSynced() {
      return this._isSynced
    }

    // --- test helpers: simulate the server signalling sync, and connectivity ---
    fireSync() {
      this._isSynced = true
      this.options?.websocket?.onSync?.()
    }
    fireConnectivity(online: boolean) {
      this.options?.websocket?.onConnectivityChange?.(online)
    }
  }
  return { ...actual, CanvasStore: MockStore }
})

import WovenCanvas from '../src/components/WovenCanvas.vue'

const WS = { documentId: 'doc', url: 'ws://localhost', clientId: 'client-1' }

function mountWithLoadingProbe(props: Record<string, unknown>) {
  return mount(WovenCanvas, {
    props,
    slots: {
      loading: (slotProps: { isLoading: boolean }) =>
        h('div', { 'data-testid': 'loading', 'data-loading': String(slotProps.isLoading) }),
    },
  })
}

function loadingState(wrapper: ReturnType<typeof mount>): string | undefined {
  return wrapper.get('[data-testid="loading"]').attributes('data-loading')
}

describe('WovenCanvas loading state', () => {
  beforeEach(() => {
    storeHolder.last = null
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('clears loading immediately for a local-only store (no websocket)', async () => {
    const wrapper = mountWithLoadingProbe({})
    await flushPromises()
    expect(loadingState(wrapper)).toBe('false')
  })

  it('keeps loading while connected and awaiting the first sync', async () => {
    const wrapper = mountWithLoadingProbe({ store: { websocket: WS } })
    await flushPromises()
    expect(loadingState(wrapper)).toBe('true')
  })

  it('clears loading once the first sync arrives', async () => {
    const wrapper = mountWithLoadingProbe({ store: { websocket: WS } })
    await flushPromises()
    expect(loadingState(wrapper)).toBe('true')

    storeHolder.last?.fireSync()
    await flushPromises()
    expect(loadingState(wrapper)).toBe('false')
  })

  it('clears loading when offline so the user can work offline', async () => {
    const wrapper = mountWithLoadingProbe({ store: { websocket: WS } })
    await flushPromises()
    expect(loadingState(wrapper)).toBe('true')

    const original = Object.getOwnPropertyDescriptor(navigator, 'onLine')
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    try {
      window.dispatchEvent(new Event('offline'))
      await flushPromises()
      expect(loadingState(wrapper)).toBe('false')
    } finally {
      if (original) Object.defineProperty(navigator, 'onLine', original)
    }
  })
})
