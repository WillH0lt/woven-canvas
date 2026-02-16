import { type CursorDef, Editor } from '@infinitecanvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Cursor } from '../../../src/singletons'
import { getCursorSvg } from '../../../src/systems/postRender/cursorSystem'
import { createMockElement } from '../../testUtils'

// Define test cursor kinds
const CursorKind = {
  Drag: 'drag',
  NS: 'ns',
} as const

// Simple test cursor definitions
const DRAG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`
const NS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>`

const TEST_CURSOR_DEFS: Record<string, CursorDef> = {
  [CursorKind.Drag]: {
    makeSvg: () => DRAG_SVG,
    hotspot: [12, 12],
    rotationOffset: 0,
  },
  [CursorKind.NS]: {
    makeSvg: () => NS_SVG,
    hotspot: [12, 12],
    rotationOffset: 0,
  },
}

describe('PostRenderCursor', () => {
  let editor: Editor
  let originalBodyCursor: string
  let mockDomElement: HTMLElement

  beforeEach(async () => {
    // Save original cursor
    originalBodyCursor = document.body.style.cursor
    document.body.style.cursor = ''

    // Create fresh DOM element for each test
    mockDomElement = createMockElement()

    // Use Editor with custom cursors (CorePlugin already includes cursorSystem)
    editor = new Editor(mockDomElement, {
      plugins: [],
      cursors: TEST_CURSOR_DEFS,
    })
    await editor.initialize()
  })

  afterEach(async () => {
    if (editor) {
      await editor.dispose()
    }
    // Restore original cursor
    document.body.style.cursor = originalBodyCursor
    // Clean up DOM element
    if (mockDomElement?.parentNode) {
      mockDomElement.parentNode.removeChild(mockDomElement)
    }
  })

  describe('cursor application', () => {
    it('should apply context cursor to document.body.style.cursor', async () => {
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0)
      })

      await editor.tick()

      const expectedCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.Drag, 0)
      expect(document.body.style.cursor).toBe(expectedCursor)
    })

    it('should apply base cursor when context cursor is empty', async () => {
      editor.nextTick((ctx) => {
        Cursor.setCursor(ctx, CursorKind.NS, 0)
      })

      await editor.tick()

      const expectedCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.NS, 0)
      expect(document.body.style.cursor).toBe(expectedCursor)
    })

    it('should use default cursor when both context and base cursor are empty', async () => {
      editor.nextTick((ctx) => {
        const cursor = Cursor.write(ctx)
        cursor.cursorKind = ''
        cursor.contextCursorKind = ''
      })

      await editor.tick()

      expect(document.body.style.cursor).toBe('default')
    })
  })

  describe('cursor priority', () => {
    it('should prioritize context cursor over base cursor', async () => {
      editor.nextTick((ctx) => {
        Cursor.setCursor(ctx, CursorKind.NS, 0)
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0)
      })

      await editor.tick()

      const expectedCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.Drag, 0)
      expect(document.body.style.cursor).toBe(expectedCursor)
    })

    it('should fall back to base cursor when context cursor is cleared', async () => {
      // First set both
      editor.nextTick((ctx) => {
        Cursor.setCursor(ctx, CursorKind.NS, 0)
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0)
      })

      await editor.tick()
      const dragCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.Drag, 0)
      expect(document.body.style.cursor).toBe(dragCursor)

      // Clear context cursor
      editor.nextTick((ctx) => {
        Cursor.clearContextCursor(ctx)
      })

      await editor.tick()

      const nsCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.NS, 0)
      expect(document.body.style.cursor).toBe(nsCursor)
    })
  })

  describe('change detection', () => {
    it('should only update DOM when cursor singleton changes', async () => {
      // Set initial cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0)
      })

      await editor.tick()
      const dragCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.Drag, 0)
      expect(document.body.style.cursor).toBe(dragCursor)

      // Manually change body cursor to something else
      document.body.style.cursor = 'pointer'

      // Tick without changing cursor singleton
      await editor.tick()

      // Cursor should still be "pointer" since singleton didn't change
      expect(document.body.style.cursor).toBe('pointer')
    })

    it('should update DOM when cursor value changes', async () => {
      // Set first cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0)
      })

      await editor.tick()
      const cursor1 = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.Drag, 0)
      expect(document.body.style.cursor).toBe(cursor1)

      // Set second cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.NS, 0)
      })

      await editor.tick()
      const cursor2 = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.NS, 0)
      expect(document.body.style.cursor).toBe(cursor2)
    })
  })

  describe('clearing cursor', () => {
    it('should revert to default when context cursor is cleared and base cursor is empty', async () => {
      // Set cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0)
      })

      await editor.tick()
      const dragCursor = getCursorSvg(TEST_CURSOR_DEFS, CursorKind.Drag, 0)
      expect(document.body.style.cursor).toBe(dragCursor)

      // Clear both context and base cursor
      editor.nextTick((ctx) => {
        Cursor.clearContextCursor(ctx)
        Cursor.setCursor(ctx, '') // Clear base cursor too
      })

      await editor.tick()
      expect(document.body.style.cursor).toBe('default')
    })
  })
})
