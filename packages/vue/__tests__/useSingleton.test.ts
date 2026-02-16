import { defineCanvasSingleton, field } from '@infinitecanvas/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, provide } from 'vue'
import { useSingleton } from '../src/composables/useSingleton'
import { INFINITE_CANVAS_KEY, type InfiniteCanvasContext } from '../src/injection'

describe('useSingleton', () => {
  // Create a test singleton definition
  const TestSingleton = defineCanvasSingleton(
    { name: 'TestSingleton' },
    {
      value: field.int32().default(0),
      name: field.string().max(32).default(''),
    },
  )

  let mockCanvasContext: InfiniteCanvasContext
  let mockSubscriptions: Map<string, Set<(value: unknown) => void>>

  beforeEach(() => {
    mockSubscriptions = new Map()

    // Mock editor returns null so we skip the eager snapshot read
    mockCanvasContext = {
      hasEntity: () => false,
      getEditor: () => null,
      getAssetManager: () => null,
      getSessionId: () => '',
      getUserBySessionId: () => null,
      subscribeComponent: () => () => {},
      registerTickCallback: () => () => {},
      subscribeSingleton: (singletonName, callback) => {
        let callbacks = mockSubscriptions.get(singletonName)
        if (!callbacks) {
          callbacks = new Set()
          mockSubscriptions.set(singletonName, callbacks)
        }
        callbacks.add(callback)
        return () => {
          callbacks!.delete(callback)
        }
      },
    }
  })

  // Helper to notify subscribers
  function notifySubscribers(singletonName: string, value: unknown) {
    const callbacks = mockSubscriptions.get(singletonName)
    if (!callbacks) return
    for (const callback of callbacks) {
      callback(value)
    }
  }

  // Helper to run composable with provided context
  function withSetup<T>(composable: () => T): T {
    let result: T

    const Provider = defineComponent({
      setup() {
        provide(INFINITE_CANVAS_KEY, mockCanvasContext)
        return () => h(Child)
      },
    })

    const Child = defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    })

    const app = createApp(Provider)
    app.mount(document.createElement('div'))
    return result!
  }

  describe('error handling', () => {
    it('should throw error when used outside InfiniteCanvas', () => {
      expect(() => {
        const app = createApp({
          setup() {
            useSingleton(TestSingleton)
            return () => h('div')
          },
        })
        app.mount(document.createElement('div'))
      }).toThrow('useSingleton must be used within an InfiniteCanvas component')
    })
  })

  describe('basic functionality', () => {
    it('should return default values when no editor available', () => {
      const result = withSetup(() => useSingleton(TestSingleton))
      // When no editor is available, useSingleton returns the singleton's default values
      expect(result.value.value).toBe(0)
      expect(result.value.name).toBe('')
    })
  })

  describe('reactivity', () => {
    it('should update when singleton value changes via subscription', () => {
      const result = withSetup(() => useSingleton(TestSingleton))
      // Initial value is the singleton's default
      expect(result.value.value).toBe(0)
      expect(result.value.name).toBe('')

      // Simulate singleton change
      notifySubscribers('TestSingleton', { value: 42, name: 'test' })
      expect(result.value).toEqual({ value: 42, name: 'test' })
    })

    it('should handle singleton being set to null', () => {
      const result = withSetup(() => useSingleton(TestSingleton))

      // Set initial value
      notifySubscribers('TestSingleton', { value: 10, name: 'initial' })
      expect(result.value).toEqual({ value: 10, name: 'initial' })

      // Set to null - should become empty object
      notifySubscribers('TestSingleton', null)
      expect(result.value).toEqual({})
    })

    it('should handle singleton being set from default to value', () => {
      const result = withSetup(() => useSingleton(TestSingleton))
      // Initial value is the singleton's default
      expect(result.value.value).toBe(0)
      expect(result.value.name).toBe('')

      // Set value
      notifySubscribers('TestSingleton', { value: 30, name: 'added' })
      expect(result.value).toEqual({ value: 30, name: 'added' })
    })
  })

  describe('multiple singletons', () => {
    const AnotherSingleton = defineCanvasSingleton(
      { name: 'AnotherSingleton' },
      {
        count: field.int32().default(0),
      },
    )

    it('should return correct data for different singletons', () => {
      const result1 = withSetup(() => useSingleton(TestSingleton))
      const result2 = withSetup(() => useSingleton(AnotherSingleton))

      notifySubscribers('TestSingleton', { value: 100, name: 'A' })
      notifySubscribers('AnotherSingleton', { count: 5 })

      expect(result1.value).toEqual({ value: 100, name: 'A' })
      expect(result2.value).toEqual({ count: 5 })
    })

    it('should handle mixed presence of singletons', () => {
      const result1 = withSetup(() => useSingleton(TestSingleton))
      const result2 = withSetup(() => useSingleton(AnotherSingleton))

      notifySubscribers('TestSingleton', { value: 100, name: 'A' })
      // AnotherSingleton not notified - stays at default

      expect(result1.value).toEqual({ value: 100, name: 'A' })
      // AnotherSingleton keeps its default value
      expect(result2.value.count).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const Child = defineComponent({
        setup() {
          useSingleton(TestSingleton)
          return () => h('div')
        },
      })

      const Provider = defineComponent({
        setup() {
          provide(INFINITE_CANVAS_KEY, mockCanvasContext)
          return () => h(Child)
        },
      })

      const app = createApp(Provider)
      app.mount(document.createElement('div'))

      // Should have subscription
      expect(mockSubscriptions.get('TestSingleton')?.size).toBe(1)

      // Unmount
      app.unmount()

      // Subscription should be removed
      expect(mockSubscriptions.get('TestSingleton')?.size).toBe(0)
    })
  })
})
