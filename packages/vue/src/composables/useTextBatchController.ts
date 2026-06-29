import type { JSONContent } from '@tiptap/core'
import { generateHTML, generateJSON } from '@tiptap/core'
import Bold from '@tiptap/extension-bold'
import Color from '@tiptap/extension-color'
import Document from '@tiptap/extension-document'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import Paragraph from '@tiptap/extension-paragraph'
import TiptapText from '@tiptap/extension-text'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import {
  Block,
  Camera,
  type Context,
  type EntityId,
  Screen,
  Text,
  type TextAlignment,
  TransformBoxState,
  TransformBoxStateSingleton,
  UpdateTransformBox,
} from '@woven-canvas/core'
import { type ComputedRef, computed, inject, type MaybeRefOrGetter, nextTick, type ShallowRef, toValue } from 'vue'
import { TEXT_EDITING_OPTIONS_KEY, WOVEN_CANVAS_KEY } from '../injection'
import { type BlockDimensions, computeBlockDimensions } from '../utils/blockDimensions'
import { normalizeColor } from '../utils/color'
import { useComponents } from './useComponents'
import { useEditorContext } from './useEditorContext'
import { useSingleton } from './useSingleton'
import { useTextEditorController } from './useTextEditorController'

// Base extensions used for parsing — must match EditableText. Host-app marks
// (TextEditingOptions.extensions) are appended per-controller so custom marks survive
// the parse/serialize boundary instead of being silently stripped.
const BASE_EXTENSIONS = [
  Document,
  Paragraph,
  TiptapText,
  TextStyle,
  Color,
  Bold,
  Italic,
  Underline,
  Link.configure({
    openOnClick: false,
  }),
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
  /** Current link href if all same (null if mixed or no link) */
  linkHref: ComputedRef<string | null>
}

export interface TextStyleOptions {
  fontFamily?: string
  fontSizePx?: number
  lineHeight?: number
  letterSpacingEm?: number
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
  /** Set a mark (by name, with attrs) on all selected text entities — for host-app marks. */
  setMark(markType: string, attrs?: Record<string, unknown>): void
  /** Remove a mark (by name) from all selected text entities. */
  unsetMark(markType: string): void
  /** Set font size on all selected text entities */
  setFontSize(size: number): void
  /** Set font family on all selected text entities */
  setFontFamily(family: string): void
  /** Set multiple text style properties at once */
  setTextStyle(options: TextStyleOptions): void
  /** Set link on all selected text entities */
  setLink(href: string): void
  /** Remove link from all selected text entities */
  removeLink(): void
}

export interface TextBatchController {
  state: TextBatchState
  commands: TextBatchCommands
  /**
   * Attributes of a mark (by name) across the selected text — the first occurrence's
   * attrs, or null if none/mixed. Reads reactively, so call it inside a `computed` to
   * track selection changes. For host-app marks read in batch (non-editing) mode.
   */
  getMarkAttrs(markType: string): Record<string, unknown> | null
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
function checkAllHaveMark(doc: JSONContent, markType: MarkType): boolean | null {
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
function getAlignment(doc: JSONContent): TextAlignment {
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
 * Get the text color from a parsed doc (returns first found color)
 */
function getTextColorFromDoc(doc: JSONContent): string | null {
  let color: string | null = null

  walkTextNodes(doc, (node) => {
    if (color === null) {
      color = getTextColor(node)
    }
  })

  return color
}

/**
 * Add an attr-less mark to every text node that lacks it. Mutates `doc` in place.
 */
function addMarkInDoc(doc: JSONContent, markType: string): void {
  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? []
    if (marks.findIndex((m) => m.type === markType) === -1) {
      node.marks = [...marks, { type: markType }]
    }
  })
}

/**
 * Remove every mark named `markType` from all text nodes. Accepts any mark name so
 * host-app marks clear the same way as the built-ins. Mutates `doc` in place.
 */
function removeMarkInDoc(doc: JSONContent, markType: string): void {
  walkTextNodes(doc, (node) => {
    node.marks = (node.marks ?? []).filter((m) => m.type !== markType)
  })
}

/**
 * Set alignment on all paragraphs. Mutates `doc` in place.
 */
function setAlignmentInDoc(doc: JSONContent, alignment: TextAlignment): void {
  walkParagraphs(doc, (paragraph) => {
    paragraph.attrs = {
      ...paragraph.attrs,
      textAlign: alignment,
    }
  })
}

/**
 * Merge `attrs` onto an existing mark named `markType` on every text node, or add the
 * mark if absent. Generic over mark name, so the built-in `textStyle` color and any
 * host-app mark (e.g. a highlight) go through one path. Mutates `doc` in place.
 */
function setMarkInDoc(doc: JSONContent, markType: string, attrs: Record<string, unknown>): void {
  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? []
    const existingIndex = marks.findIndex((m) => m.type === markType)

    if (existingIndex !== -1) {
      marks[existingIndex] = {
        ...marks[existingIndex],
        attrs: { ...marks[existingIndex].attrs, ...attrs },
      }
      node.marks = marks
    } else {
      node.marks = [...marks, { type: markType, attrs }]
    }
  })
}

/**
 * First occurrence's attrs for `markType` across all text nodes, or null if no node
 * carries it. Used to read host-app mark state in batch (non-editing) mode.
 */
function getMarkAttrsFromDoc(doc: JSONContent, markType: string): Record<string, unknown> | null {
  let attrs: Record<string, unknown> | null = null
  walkTextNodes(doc, (node) => {
    if (attrs === null) {
      const mark = node.marks?.find((m) => m.type === markType)
      if (mark) attrs = mark.attrs ?? {}
    }
  })
  return attrs
}

/**
 * Get the link href from a parsed doc (returns first found href, null if none)
 */
function getLinkHrefFromDoc(doc: JSONContent): string | null {
  let href: string | null = null

  walkTextNodes(doc, (node) => {
    if (href === null) {
      const linkMark = node.marks?.find((m) => m.type === 'link')
      if (linkMark?.attrs?.href) {
        href = linkMark.attrs.href as string
      }
    }
  })

  return href
}

/**
 * Set the link mark (with href + safe rel/target) on all text nodes, merging onto an
 * existing link. Mutates `doc` in place. (Removal goes through `removeMarkInDoc`.)
 */
function setLinkInDoc(doc: JSONContent, href: string): void {
  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? []
    const existingIndex = marks.findIndex((m) => m.type === 'link')

    if (existingIndex !== -1) {
      marks[existingIndex] = {
        ...marks[existingIndex],
        attrs: { ...marks[existingIndex].attrs, href },
      }
      node.marks = marks
    } else {
      node.marks = [...marks, { type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }]
    }
  })
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
 * Find the block element by querying the DOM.
 * Returns the block component's root element (first child of .wov-block),
 * which may include padding/styling that should be part of the measurement.
 */
function findBlockElement(entityId: EntityId): HTMLElement | null {
  const blockElement = document.querySelector(`[data-entity-id="${entityId}"]`)
  if (!blockElement) return null

  // The first child of .wov-block is the block component's root element
  // (e.g., .wov-sticky-note, .wov-text-block) which defines the visual bounds
  const firstChild = blockElement.firstElementChild as HTMLElement | null
  if (firstChild) return firstChild

  // Fallback to finding the editable text directly
  return blockElement.querySelector('.wov-editable-text') as HTMLElement | null
}

type CameraRef = ShallowRef<{ left: number; top: number; zoom: number }>
type ScreenRef = ShallowRef<{ left: number; top: number }>

/**
 * Refresh the transform box so its bounds/handles follow a programmatic (menu-driven)
 * resize of the selected text. Only when the box is in the `Idle` state — i.e. a
 * selected-but-not-editing block, where the box is actually visible. While editing
 * (`Editing` state) the box is hidden and its handles removed, so re-emitting an update
 * there would wrongly resurrect the handles mid-edit. Nothing else re-syncs the box for
 * these menu changes, so without this it stays at the old size until the next
 * selection/pointer event.
 */
function refreshTransformBox(ctx: Context): void {
  const tb = TransformBoxStateSingleton.read(ctx)
  if (tb.transformBoxId !== null && tb.state === TransformBoxState.Idle) {
    UpdateTransformBox.spawn(ctx, { transformBoxId: tb.transformBoxId })
  }
}

/**
 * Measure text dimensions using an off-screen clone.
 * This allows us to measure the effect of style/content changes synchronously.
 */
function measureWithClone(
  element: HTMLElement,
  camera: CameraRef,
  screen: ScreenRef,
  text: { content: string; fontSizePx: number; fontFamily: string; lineHeight: number; letterSpacingEm: number },
): BlockDimensions {
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement

  // Make invisible but measurable - position at same location as original
  clone.style.position = 'absolute'
  clone.style.visibility = 'hidden'
  clone.style.pointerEvents = 'none'
  clone.style.top = '0'
  clone.style.left = '0'

  // Find the text element within the clone (may be the clone itself or a child)
  const textElement = clone.classList.contains('wov-editable-text')
    ? clone
    : (clone.querySelector('.wov-editable-text') as HTMLElement | null)

  // Apply style changes to the text element
  if (textElement) {
    textElement.style.fontSize = `${text.fontSizePx}px`
    textElement.style.fontFamily = text.fontFamily
    textElement.style.lineHeight = String(text.lineHeight)
    textElement.style.letterSpacing = `${text.letterSpacingEm}em`
  }

  // Apply content to ProseMirror element
  const proseMirror = clone.querySelector('.ProseMirror, .tiptap')
  if (proseMirror) {
    proseMirror.innerHTML = text.content
  } else if (textElement) {
    textElement.innerHTML = text.content
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
  const canvasContext = inject(WOVEN_CANVAS_KEY)!
  const textsMap = useComponents(entityIds, Text)
  const camera = useSingleton(Camera)
  const screen = useSingleton(Screen)
  const textEditorController = useTextEditorController()
  const textOptions = inject(TEXT_EDITING_OPTIONS_KEY, undefined)

  // The parse/serialize boundary: base schema + host-app marks, so app-provided marks
  // survive the round-trip below instead of being stripped. `exts` lives only here.
  const exts = computed(() => {
    const extra = textOptions?.value.extensions
    return extra && extra.length > 0 ? [...BASE_EXTENSIONS, ...extra] : BASE_EXTENSIONS
  })
  const parse = (html: string): JSONContent => generateJSON(html, exts.value)
  const toHtml = (doc: JSONContent): string => generateHTML(doc, exts.value)
  /** Parse → mutate (in place) → serialize. Empty content passes straight through. */
  const rewrite = (html: string, mutate: (doc: JSONContent) => void): string => {
    if (!html.trim()) return html
    const doc = parse(html)
    mutate(doc)
    return toHtml(doc)
  }

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
        const doc = text.content ? parse(text.content) : null
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

        const contentAlignment = text.content ? getAlignment(parse(text.content)) : 'left'

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

        const contentColor = text.content ? getTextColorFromDoc(parse(text.content)) : null

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

    linkHref: computed(() => {
      let href: string | null = null
      let foundAny = false

      for (const text of textsMap.value.values()) {
        if (!text) continue

        const contentHref = text.content ? getLinkHrefFromDoc(parse(text.content)) : null

        if (!foundAny) {
          href = contentHref
          foundAny = true
        } else if (href !== contentHref) {
          return null // mixed
        }
      }

      return href
    }),
  }

  function computeMarkState(markType: MarkType): boolean | null {
    let overallState: boolean | null = null
    let foundAny = false

    for (const text of textsMap.value.values()) {
      if (!text) continue

      const contentState = text.content ? checkAllHaveMark(parse(text.content), markType) : false

      if (!foundAny) {
        overallState = contentState
        foundAny = true
      } else if (overallState !== contentState) {
        return null // mixed across entities
      }
    }

    return overallState
  }

  function getMarkAttrs(markType: string): Record<string, unknown> | null {
    let attrs: Record<string, unknown> | null = null
    let foundAny = false

    for (const text of textsMap.value.values()) {
      if (!text) continue

      const contentAttrs = text.content ? getMarkAttrsFromDoc(parse(text.content), markType) : null

      if (!foundAny) {
        attrs = contentAttrs
        foundAny = true
      } else if (JSON.stringify(attrs) !== JSON.stringify(contentAttrs)) {
        return null // mixed
      }
    }

    return attrs
  }

  const commands: TextBatchCommands = {
    toggleBold() {
      applyContentChange((content) =>
        rewrite(content, (doc) => (state.isBold.value ? removeMarkInDoc(doc, 'bold') : addMarkInDoc(doc, 'bold'))),
      )
    },

    toggleItalic() {
      applyContentChange((content) =>
        rewrite(content, (doc) =>
          state.isItalic.value ? removeMarkInDoc(doc, 'italic') : addMarkInDoc(doc, 'italic'),
        ),
      )
    },

    toggleUnderline() {
      applyContentChange((content) =>
        rewrite(content, (doc) =>
          state.isUnderline.value ? removeMarkInDoc(doc, 'underline') : addMarkInDoc(doc, 'underline'),
        ),
      )
    },

    setAlignment(alignment: TextAlignment) {
      // Alignment doesn't affect dimensions, no measurement needed
      applyContentOnly((content) => rewrite(content, (doc) => setAlignmentInDoc(doc, alignment)))
    },

    setColor(color: string) {
      // Color doesn't affect dimensions, no measurement needed
      applyContentOnly((content) => rewrite(content, (doc) => setMarkInDoc(doc, 'textStyle', { color })))
    },

    setMark(markType: string, attrs: Record<string, unknown> = {}) {
      // A host-app mark could affect layout, so measure + resize like a content change.
      applyContentChange((content) => rewrite(content, (doc) => setMarkInDoc(doc, markType, attrs)))
    },

    unsetMark(markType: string) {
      applyContentChange((content) => rewrite(content, (doc) => removeMarkInDoc(doc, markType)))
    },

    setFontSize(size: number) {
      // Mirror setFontFamily: the pick becomes the default for new text.
      canvasContext.setDefaults('text', { fontSizePx: size })
      applyTextStyleChange(
        (text) => ({ ...text, fontSizePx: size }),
        (text) => {
          text.fontSizePx = size
        },
      )
    },

    setFontFamily(family: string) {
      canvasContext.setDefaults('text', { fontFamily: family })
      applyTextStyleChange(
        (text) => ({ ...text, fontFamily: family }),
        (text) => {
          text.fontFamily = family
        },
      )
    },

    setTextStyle(options: TextStyleOptions) {
      const textDefaults: Record<string, unknown> = {}
      if (options.fontFamily !== undefined) textDefaults.fontFamily = options.fontFamily
      if (options.fontSizePx !== undefined) textDefaults.fontSizePx = options.fontSizePx
      if (options.lineHeight !== undefined) textDefaults.lineHeight = options.lineHeight
      if (options.letterSpacingEm !== undefined) textDefaults.letterSpacingEm = options.letterSpacingEm
      if (Object.keys(textDefaults).length > 0) {
        canvasContext.setDefaults('text', textDefaults)
      }
      applyTextStyleChange(
        (text) => ({
          ...text,
          fontFamily: options.fontFamily ?? text.fontFamily,
          fontSizePx: options.fontSizePx ?? text.fontSizePx,
          lineHeight: options.lineHeight ?? text.lineHeight,
          letterSpacingEm: options.letterSpacingEm ?? text.letterSpacingEm,
        }),
        (text) => {
          if (options.fontFamily !== undefined) text.fontFamily = options.fontFamily
          if (options.fontSizePx !== undefined) text.fontSizePx = options.fontSizePx
          if (options.lineHeight !== undefined) text.lineHeight = options.lineHeight
          if (options.letterSpacingEm !== undefined) text.letterSpacingEm = options.letterSpacingEm
        },
      )
    },

    setLink(href: string) {
      // Links don't affect dimensions, no measurement needed
      applyContentOnly((content) => rewrite(content, (doc) => setLinkInDoc(doc, href)))
    },

    removeLink() {
      // Links don't affect dimensions, no measurement needed
      applyContentOnly((content) => rewrite(content, (doc) => removeMarkInDoc(doc, 'link')))
    },
  }

  type TextSnapshot = {
    content: string
    fontSizePx: number
    fontFamily: string
    lineHeight: number
    letterSpacingEm: number
  }

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

      const element = findBlockElement(entityId)
      if (element) {
        const dims = measureWithClone(element, camera, screen, getCloneText(text))
        updates.push({ entityId, ...dims })
      }
    }

    nextEditorTick((ctx) => {
      for (const entityId of ids) {
        applyChange(Text.write(ctx, entityId))
      }

      // Update block dimensions and position. `left`/`top` from
      // measureWithClone are WORLD coordinates, but `block.position`
      // is parent-local — go through `Block.setWorldPosition` so the
      // parent's world offset is subtracted out. Without this, text
      // inside a frame jumps by the frame's world position.
      for (const { entityId, width, height, left, top } of updates) {
        const writable = Block.write(ctx, entityId)
        writable.size = [width, height]
        Block.setWorldPosition(ctx, entityId, [left, top])
      }

      // Follow the resize with the transform box (selected-but-not-editing case).
      refreshTransformBox(ctx)

      // Trigger floating menu position update after Vue re-renders
      // and restore focus to the editor if it exists (may have lost focus due to DOM changes)
      nextTick(() => {
        textEditorController.updateCounter.value++
        textEditorController.editor.value?.commands.focus()
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
      const element = findBlockElement(entityId)

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

        // Update block dimensions and position if we measured them.
        // `left`/`top` are WORLD coordinates from measureWithClone;
        // `block.position` is parent-local, so go through
        // `Block.setWorldPosition` to subtract the parent's offset.
        if (width > 0 && height > 0) {
          const writable = Block.write(ctx, entityId)
          writable.size = [width, height]
          Block.setWorldPosition(ctx, entityId, [left, top])
        }
      }

      // Keep the transform box in sync with the resize (see applyTextStyleChange).
      refreshTransformBox(ctx)
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
    getMarkAttrs,
  }
}
