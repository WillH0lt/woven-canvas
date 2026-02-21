import { Text } from '@woven-canvas/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, provide } from 'vue'
import { useTextBatchController } from '../src/composables/useTextBatchController'
import { WOVEN_CANVAS_KEY, type WovenCanvasContext } from '../src/injection'

describe('useTextBatchController', () => {
  let mockCanvasContext: WovenCanvasContext
  let mockComponentSubscriptions: Map<number, Map<string, Set<(value: unknown) => void>>>
  let mockEntities: Set<number>

  beforeEach(() => {
    mockComponentSubscriptions = new Map()
    mockEntities = new Set()

    mockCanvasContext = {
      hasEntity: (entityId) => mockEntities.has(entityId),
      // Return null to skip eager reads that require full editor context
      getEditor: () => null,
      getAssetManager: () => null,
      getSessionId: () => 'test-session',
      getUserBySessionId: () => null,
      subscribeComponent: (entityId, componentName, callback) => {
        let entitySubs = mockComponentSubscriptions.get(entityId)
        if (!entitySubs) {
          entitySubs = new Map()
          mockComponentSubscriptions.set(entityId, entitySubs)
        }
        let callbacks = entitySubs.get(componentName)
        if (!callbacks) {
          callbacks = new Set()
          entitySubs.set(componentName, callbacks)
        }
        callbacks.add(callback)
        return () => {
          callbacks!.delete(callback)
        }
      },
      subscribeSingleton: () => () => {},
      registerTickCallback: () => () => {},
    }
  })

  function notifyComponentSubscribers(entityId: number, componentName: string, value: unknown) {
    const entitySubs = mockComponentSubscriptions.get(entityId)
    if (!entitySubs) return
    const callbacks = entitySubs.get(componentName)
    if (!callbacks) return
    for (const callback of callbacks) {
      callback(value)
    }
  }

  function withSetup<T>(composable: () => T): T {
    let result: T

    const Provider = defineComponent({
      setup() {
        provide(WOVEN_CANVAS_KEY, mockCanvasContext)
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

  describe('state.hasTextEntities', () => {
    it('should return false when no entities', () => {
      const { state } = withSetup(() => useTextBatchController(() => []))
      expect(state.hasTextEntities.value).toBe(false)
    })

    it('should return true when entities have Text component', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      // Notify that entity 1 has a Text component
      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.hasTextEntities.value).toBe(true)
    })
  })

  describe('state.hasTextContent', () => {
    it('should return false when content is empty', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p></p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.hasTextContent.value).toBe(false)
    })

    it('should return true when content has text', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello World</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.hasTextContent.value).toBe(true)
    })
  })

  describe('state.isBold', () => {
    it('should return false when no bold marks', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.isBold.value).toBe(false)
    })

    it('should return true when all text is bold', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p><strong>Hello</strong></p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.isBold.value).toBe(true)
    })

    it('should return null when mixed bold state', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p><strong>Bold</strong> and not bold</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.isBold.value).toBeNull()
    })
  })

  describe('state.isItalic', () => {
    it('should return false when no italic marks', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.isItalic.value).toBe(false)
    })

    it('should return true when all text is italic', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p><em>Hello</em></p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.isItalic.value).toBe(true)
    })
  })

  describe('state.fontSize', () => {
    it('should return fontSize when all entities have same size', () => {
      mockEntities.add(1)
      mockEntities.add(2)
      const { state } = withSetup(() => useTextBatchController(() => [1, 2]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })
      notifyComponentSubscribers(2, Text.name, {
        content: '<p>World</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.fontSize.value).toBe(24)
    })

    it('should return null when entities have different sizes', () => {
      mockEntities.add(1)
      mockEntities.add(2)
      const { state } = withSetup(() => useTextBatchController(() => [1, 2]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })
      notifyComponentSubscribers(2, Text.name, {
        content: '<p>World</p>',
        fontSizePx: 32,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.fontSize.value).toBeNull()
    })
  })

  describe('state.fontFamily', () => {
    it('should return fontFamily when all entities have same family', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Roboto',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.fontFamily.value).toBe('Roboto')
    })

    it('should return null when entities have different families', () => {
      mockEntities.add(1)
      mockEntities.add(2)
      const { state } = withSetup(() => useTextBatchController(() => [1, 2]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })
      notifyComponentSubscribers(2, Text.name, {
        content: '<p>World</p>',
        fontSizePx: 24,
        fontFamily: 'Roboto',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.fontFamily.value).toBeNull()
    })
  })

  describe('state.alignment', () => {
    it('should return left by default', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p>Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.alignment.value).toBe('left')
    })

    it('should return center when text is centered', () => {
      mockEntities.add(1)
      const { state } = withSetup(() => useTextBatchController(() => [1]))

      notifyComponentSubscribers(1, Text.name, {
        content: '<p style="text-align: center">Hello</p>',
        fontSizePx: 24,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        letterSpacingEm: 0,
        constrainWidth: true,
        defaultAlignment: 'left',
      })

      expect(state.alignment.value).toBe('center')
    })
  })
})
