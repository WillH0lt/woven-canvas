import type { JSONContent } from '@tiptap/core'
import { generateHTML, generateJSON } from '@tiptap/core'
import Bold from '@tiptap/extension-bold'
import Color from '@tiptap/extension-color'
import Document from '@tiptap/extension-document'
import Italic from '@tiptap/extension-italic'
import Paragraph from '@tiptap/extension-paragraph'
import TiptapText from '@tiptap/extension-text'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { Block, Camera, type EntityId, Screen, Text, type TextAlignment } from '@woven-canvas/core'
import { type ComputedRef, computed, type MaybeRefOrGetter, nextTick, type ShallowRef, toValue } from 'vue'
import { type BlockDimensions, computeBlockDimensions } from '../utils/blockDimensions'
import { normalizeColor } from '../utils/color'
import { useComponents } from './useComponents'
import { useEditorContext } from './useEditorContext'
import { useSingleton } from './useSingleton'
import { useTextEditorController } from './useTextEditorController'

// Extensions used for parsing - must match EditableText
const extensions = [
  Document,
  Paragraph,
  TiptapText,
  TextStyle,
  Color,
  Bold,
  Italic,
  Underline,
  TextAlign.configure({
    types: ['paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'left',
  }),
]

export interface TextBatchState {
  /** Whether there are any text entities to edit */
  hasTextEntities: ComputedRef<boolean>
  /** Whether any text entity has non-empty content */
  hasTextContent: ComputedRef<boolean>
  /** Whether all text content is bold (null if mixed) */
  isBold: ComputedRef<boolean | null>
  /** Whether all text content is italic (null if mixed) */
  isItalic: ComputedRef<boolean | null>
  /** Whether all text content is underlined (null if mixed) */
  isUnderline: ComputedRef<boolean | null>
  /** Current alignment if all same (null if mixed) */
  alignment: ComputedRef<TextAlignment | null>
  /** Current color if all same (null if mixed or no color) */
  color: ComputedRef<string | null>
  /** Current font size if all same (null if mixed) */
  fontSize: ComputedRef<number | null>
  /** Current font family if all same (null if mixed) */
  fontFamily: ComputedRef<string | null>
}

export interface TextBatchCommands {
  /** Toggle bold on all selected text entities */
  toggleBold(): void
  /** Toggle italic on all selected text entities */
  toggleItalic(): void
  /** Toggle underline on all selected text entities */
  toggleUnderline(): void
  /** Set alignment on all selected text entities */
  setAlignment(alignment: TextAlignment): void
  /** Set color on all selected text entities */
  setColor(color: string): void
  /** Set font size on all selected text entities */
  setFontSize(size: number): void
  /** Set font family on all selected text entities */
  setFontFamily(family: string): void
}

export interface TextBatchController {
  state: TextBatchState
  commands: TextBatchCommands
}

// ============================================================================
// JSON Manipulation Helpers
// ============================================================================

type MarkType = 'bold' | 'italic' | 'underline' | 'textStyle'

interface Mark {
  type: string
  attrs?: Record<string, unknown>
}

interface TextNode extends JSONContent {
  type: 'text'
  text: string
  marks?: Mark[]
}

function isTextNode(node: JSONContent): node is TextNode {
  return node.type === 'text' && typeof node.text === 'string'
}

/**
 * Walk all text nodes in a document and call the callback for each
 */
function walkTextNodes(doc: JSONContent, callback: (node: TextNode) => void): void {
  if (isTextNode(doc)) {
    callback(doc)
    return
  }

  if (doc.content) {
    for (const child of doc.content) {
      walkTextNodes(child, callback)
    }
  }
}

/**
 * Walk all paragraph nodes in a document and call the callback for each
 */
function walkParagraphs(doc: JSONContent, callback: (node: JSONContent) => void): void {
  if (doc.type === 'paragraph') {
    callback(doc)
    return
  }

  if (doc.content) {
    for (const child of doc.content) {
      walkParagraphs(child, callback)
    }
  }
}

/**
 * Check if a text node has a specific mark
 */
function hasMark(node: TextNode, markType: MarkType): boolean {
  return node.marks?.some((m) => m.type === markType) ?? false
}

/**
 * Get the color from a text node's textStyle mark
 */
function getTextColor(node: TextNode): string | null {
  const textStyleMark = node.marks?.find((m) => m.type === 'textStyle')
  const color = (textStyleMark?.attrs?.color as string) ?? null
  return color ? normalizeColor(color) : null
}

/**
 * Check if all text nodes in HTML have a specific mark
 * Returns true if all have it, false if none have it, null if mixed
 */
function checkAllHaveMark(html: string, markType: MarkType): boolean | null {
  if (!html.trim()) return false

  const doc = generateJSON(html, extensions)
  let hasAny = false
  let allHave = true
  let textNodeCount = 0

  walkTextNodes(doc, (node) => {
    textNodeCount++
    if (hasMark(node, markType)) {
      hasAny = true
    } else {
      allHave = false
    }
  })

  if (textNodeCount === 0) return false
  if (allHave) return true
  if (!hasAny) return false
  return null // mixed
}

/**
 * Get the alignment from HTML content
 */
function getAlignment(html: string): TextAlignment {
  if (!html.trim()) return 'left'

  const doc = generateJSON(html, extensions)
  let alignment: TextAlignment = 'left'

  walkParagraphs(doc, (paragraph) => {
    const textAlign = paragraph.attrs?.textAlign as TextAlignment | undefined
    if (textAlign) {
      alignment = textAlign
    }
  })

  return alignment
}

/**
 * Get the text color from HTML content (returns first found color)
 */
function getTextColorFromHtml(html: string): string | null {
  if (!html.trim()) return null

  const doc = generateJSON(html, extensions)
  let color: string | null = null

  walkTextNodes(doc, (node) => {
    if (color === null) {
      color = getTextColor(node)
    }
  })

  return color
}

/**
 * Add a mark to all text nodes in HTML
 */
function addMarkInHtml(html: string, markType: MarkType): string {
  if (!html.trim()) return html

  const doc = generateJSON(html, extensions)

  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? []
    const existingIndex = marks.findIndex((m) => m.type === markType)

    if (existingIndex === -1) {
      node.marks = [...marks, { type: markType }]
    }
  })

  return generateHTML(doc, extensions)
}

/**
 * Remove a mark from all text nodes in HTML
 */
function removeMarkInHtml(html: string, markType: MarkType): string {
  if (!html.trim()) return html

  const doc = generateJSON(html, extensions)

  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? []
    node.marks = marks.filter((m) => m.type !== markType)
  })

  return generateHTML(doc, extensions)
}

/**
 * Set alignment on all paragraphs in HTML
 */
function setAlignmentInHtml(html: string, alignment: TextAlignment): string {
  if (!html.trim()) return html

  const doc = generateJSON(html, extensions)

  walkParagraphs(doc, (paragraph) => {
    paragraph.attrs = {
      ...paragraph.attrs,
      textAlign: alignment,
    }
  })

  return generateHTML(doc, extensions)
}

/**
 * Set color on all text nodes in HTML
 */
function setColorInHtml(html: string, color: string): string {
  if (!html.trim()) return html

  const doc = generateJSON(html, extensions)

  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? []
    const existingIndex = marks.findIndex((m) => m.type === 'textStyle')

    if (existingIndex !== -1) {
      // Update existing textStyle mark
      marks[existingIndex] = {
        ...marks[existingIndex],
        attrs: {
          ...marks[existingIndex].attrs,
          color,
        },
      }
      node.marks = marks
    } else {
      // Add new textStyle mark
      node.marks = [...marks, { type: 'textStyle', attrs: { color } }]
    }
  })

  return generateHTML(doc, extensions)
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Composable for batch editing text properties across multiple selected entities
 * when no text editor is active.
 *
 * This complements useTextEditorController which handles single-entity editing
 * when a TipTap editor is active.
 *
 * @param entityIds - Reactive array of entity IDs to batch edit
 *
 * @example
 * ```vue
 * <script setup>
 * const { state, commands } = useTextBatchController(() => props.entityIds);
 *
 * // Toggle bold on all selected text entities
 * commands.toggleBold();
 * </script>
 * ```
 */
type MeasuredUpdate = BlockDimensions & { entityId: EntityId }

/**
 * Find the text element for an entity by querying the DOM.
 */
function findTextElement(entityId: EntityId): HTMLElement | null {
  const blockElement = document.querySelector(`[data-entity-id="${entityId}"]`)
  if (!blockElement) return null
  return blockElement.querySelector('.wov-editable-text') as HTMLElement | null
}

type CameraRef = ShallowRef<{ left: number; top: number; zoom: number }>
type ScreenRef = ShallowRef<{ left: number; top: number }>

/**
 * Measure text dimensions using an off-screen clone.
 * This allows us to measure the effect of style/content changes synchronously.
 */
function measureWithClone(
  element: HTMLElement,
  camera: CameraRef,
  screen: ScreenRef,
  text: { content: string; fontSizePx: number; fontFamily: string },
): BlockDimensions {
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement

  // Make invisible but measurable - position at same location as original
  clone.style.position = 'absolute'
  clone.style.visibility = 'hidden'
  clone.style.pointerEvents = 'none'
  clone.style.top = '0'
  clone.style.left = '0'

  // Apply style changes from the text clone
  clone.style.fontSize = `${text.fontSizePx}px`
  clone.style.fontFamily = text.fontFamily

  // Apply content
  const proseMirror = clone.querySelector('.ProseMirror, .tiptap')
  if (proseMirror) {
    proseMirror.innerHTML = text.content
  } else {
    clone.innerHTML = text.content
  }

  // Insert as sibling to preserve .wov-block rotation context
  element.parentElement?.appendChild(clone)

  // Measure using computeBlockDimensions (handles rotation and camera transform)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dims = computeBlockDimensions(clone, camera as any, screen as any)

  // Cleanup
  clone.remove()

  return dims
}

export function useTextBatchController(entityIds: MaybeRefOrGetter<EntityId[]>): TextBatchController {
  const { nextEditorTick } = useEditorContext()
  const textsMap = useComponents(entityIds, Text)
  const camera = useSingleton(Camera)
  const screen = useSingleton(Screen)
  const textEditorController = useTextEditorController()

  const state: TextBatchState = {
    hasTextEntities: computed(() => {
      for (const text of textsMap.value.values()) {
        if (text) return true
      }
      return false
    }),

    hasTextContent: computed(() => {
      for (const text of textsMap.value.values()) {
        if (!text) continue
        // Check if content has actual text (not just empty HTML tags)
        const doc = text.content ? generateJSON(text.content, extensions) : null
        if (doc) {
          let hasText = false
          walkTextNodes(doc, (node) => {
            if (node.text?.trim()) {
              hasText = true
            }
          })
          if (hasText) return true
        }
      }
      return false
    }),

    isBold: computed(() => {
      return computeMarkState('bold')
    }),

    isItalic: computed(() => {
      return computeMarkState('italic')
    }),

    isUnderline: computed(() => {
      return computeMarkState('underline')
    }),

    alignment: computed(() => {
      let alignment: TextAlignment | null = null

      for (const text of textsMap.value.values()) {
        if (!text) continue

        const contentAlignment = getAlignment(text.content)

        if (alignment === null) {
          alignment = contentAlignment
        } else if (alignment !== contentAlignment) {
          return null // mixed
        }
      }

      return alignment ?? 'left'
    }),

    color: computed(() => {
      let color: string | null = null
      let foundAny = false

      for (const text of textsMap.value.values()) {
        if (!text) continue

        const contentColor = getTextColorFromHtml(text.content)

        if (!foundAny) {
          color = contentColor
          foundAny = true
        } else if (color !== contentColor) {
          return null // mixed
        }
      }

      return color
    }),

    fontSize: computed(() => {
      let fontSize: number | null = null
      let foundAny = false

      for (const text of textsMap.value.values()) {
        if (!text) continue

        if (!foundAny) {
          fontSize = text.fontSizePx
          foundAny = true
        } else if (fontSize !== text.fontSizePx) {
          return null // mixed
        }
      }

      return fontSize
    }),

    fontFamily: computed(() => {
      let fontFamily: string | null = null
      let foundAny = false

      for (const text of textsMap.value.values()) {
        if (!text) continue

        if (!foundAny) {
          fontFamily = text.fontFamily
          foundAny = true
        } else if (fontFamily !== text.fontFamily) {
          return null // mixed
        }
      }

      return fontFamily
    }),
  }

  function computeMarkState(markType: MarkType): boolean | null {
    let overallState: boolean | null = null
    let foundAny = false

    for (const text of textsMap.value.values()) {
      if (!text) continue

      const contentState = checkAllHaveMark(text.content, markType)

      if (!foundAny) {
        overallState = contentState
        foundAny = true
      } else if (overallState !== contentState) {
        return null // mixed across entities
      }
    }

    return overallState
  }

  const commands: TextBatchCommands = {
    toggleBold() {
      applyContentChange((content) =>
        state.isBold.value ? removeMarkInHtml(content, 'bold') : addMarkInHtml(content, 'bold'),
      )
    },

    toggleItalic() {
      applyContentChange((content) =>
        state.isItalic.value ? removeMarkInHtml(content, 'italic') : addMarkInHtml(content, 'italic'),
      )
    },

    toggleUnderline() {
      applyContentChange((content) =>
        state.isUnderline.value ? removeMarkInHtml(content, 'underline') : addMarkInHtml(content, 'underline'),
      )
    },

    setAlignment(alignment: TextAlignment) {
      // Alignment doesn't affect dimensions, no measurement needed
      applyContentOnly((content) => setAlignmentInHtml(content, alignment))
    },

    setColor(color: string) {
      // Color doesn't affect dimensions, no measurement needed
      applyContentOnly((content) => setColorInHtml(content, color))
    },

    setFontSize(size: number) {
      applyTextStyleChange(
        (text) => ({ ...text, fontSizePx: size }),
        (text) => {
          text.fontSizePx = size
        },
      )
    },

    setFontFamily(family: string) {
      applyTextStyleChange(
        (text) => ({ ...text, fontFamily: family }),
        (text) => {
          text.fontFamily = family
        },
      )
    },
  }

  type TextSnapshot = { content: string; fontSizePx: number; fontFamily: string }

  /**
   * Apply a text style change (font size/family) and update block dimensions.
   */
  function applyTextStyleChange(
    getCloneText: (text: TextSnapshot) => TextSnapshot,
    applyChange: (text: ReturnType<typeof Text.write>) => void,
  ): void {
    const ids = toValue(entityIds)
    const updates: MeasuredUpdate[] = []

    for (const entityId of ids) {
      const text = textsMap.value.get(entityId)
      if (!text) continue

      const element = findTextElement(entityId)
      if (element) {
        const dims = measureWithClone(element, camera, screen, getCloneText(text))
        updates.push({ entityId, ...dims })
      }
    }

    nextEditorTick((ctx) => {
      for (const entityId of ids) {
        applyChange(Text.write(ctx, entityId))
      }

      // Update block dimensions and position
      for (const { entityId, width, height, left, top } of updates) {
        const block = Block.write(ctx, entityId)
        block.size = [width, height]
        block.position = [left, top]
      }

      // Trigger floating menu position update after Vue re-renders
      nextTick(() => {
        textEditorController.updateCounter.value++
      })
    })
  }

  /**
   * Apply content transformation and update block dimensions.
   * Used for changes that affect text layout (bold, italic, underline).
   */
  function applyContentChange(transform: (content: string) => string): void {
    const ids = toValue(entityIds)

    // Compute new content and measure dimensions
    const updates: (MeasuredUpdate & { content: string })[] = []

    for (const entityId of ids) {
      const text = textsMap.value.get(entityId)
      if (!text) continue

      const newContent = transform(text.content)
      const element = findTextElement(entityId)

      if (element) {
        const dims = measureWithClone(element, camera, screen, { ...text, content: newContent })
        updates.push({ entityId, content: newContent, ...dims })
      } else {
        // No element found, just update content without dimensions
        updates.push({ entityId, content: newContent, width: 0, height: 0, left: 0, top: 0 })
      }
    }

    nextEditorTick((ctx) => {
      for (const { entityId, content, width, height, left, top } of updates) {
        const text = Text.write(ctx, entityId)
        text.content = content

        // Update block dimensions and position if we measured them
        if (width > 0 && height > 0) {
          const block = Block.write(ctx, entityId)
          block.size = [width, height]
          block.position = [left, top]
        }
      }
    })
  }

  /**
   * Apply content transformation without updating dimensions.
   * Used for changes that don't affect text layout (color, alignment).
   */
  function applyContentOnly(transform: (content: string) => string): void {
    const ids = toValue(entityIds)

    nextEditorTick((ctx) => {
      for (const entityId of ids) {
        const text = Text.write(ctx, entityId)
        text.content = transform(text.content)
      }
    })
  }

  return {
    state,
    commands,
  }
}
