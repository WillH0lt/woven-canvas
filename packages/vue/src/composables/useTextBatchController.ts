import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";
import { Text, type EntityId } from "@infinitecanvas/editor";
import { generateJSON, generateHTML } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import TiptapText from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";

import { useComponents } from "./useComponents";
import { useEditorContext } from "./useEditorContext";
import { normalizeColor } from "../utils/color";
import { type TextAlignment } from "@infinitecanvas/editor";

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
    types: ["paragraph"],
    alignments: ["left", "center", "right", "justify"],
    defaultAlignment: "left",
  }),
];

export interface TextBatchState {
  /** Whether there are any text entities to edit */
  hasTextEntities: ComputedRef<boolean>;
  /** Whether all text content is bold (null if mixed) */
  isBold: ComputedRef<boolean | null>;
  /** Whether all text content is italic (null if mixed) */
  isItalic: ComputedRef<boolean | null>;
  /** Whether all text content is underlined (null if mixed) */
  isUnderline: ComputedRef<boolean | null>;
  /** Current alignment if all same (null if mixed) */
  alignment: ComputedRef<TextAlignment | null>;
  /** Current color if all same (null if mixed or no color) */
  color: ComputedRef<string | null>;
  /** Current font size if all same (null if mixed) */
  fontSize: ComputedRef<number | null>;
  /** Current font family if all same (null if mixed) */
  fontFamily: ComputedRef<string | null>;
}

export interface TextBatchCommands {
  /** Toggle bold on all selected text entities */
  toggleBold(): void;
  /** Toggle italic on all selected text entities */
  toggleItalic(): void;
  /** Toggle underline on all selected text entities */
  toggleUnderline(): void;
  /** Set alignment on all selected text entities */
  setAlignment(alignment: TextAlignment): void;
  /** Set color on all selected text entities */
  setColor(color: string): void;
  /** Set font size on all selected text entities */
  setFontSize(size: number): void;
  /** Set font family on all selected text entities */
  setFontFamily(family: string): void;
}

export interface TextBatchController {
  state: TextBatchState;
  commands: TextBatchCommands;
}

// ============================================================================
// JSON Manipulation Helpers
// ============================================================================

type MarkType = "bold" | "italic" | "underline" | "textStyle";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TextNode extends JSONContent {
  type: "text";
  text: string;
  marks?: Mark[];
}

function isTextNode(node: JSONContent): node is TextNode {
  return node.type === "text" && typeof node.text === "string";
}

/**
 * Walk all text nodes in a document and call the callback for each
 */
function walkTextNodes(
  doc: JSONContent,
  callback: (node: TextNode) => void,
): void {
  if (isTextNode(doc)) {
    callback(doc);
    return;
  }

  if (doc.content) {
    for (const child of doc.content) {
      walkTextNodes(child, callback);
    }
  }
}

/**
 * Walk all paragraph nodes in a document and call the callback for each
 */
function walkParagraphs(
  doc: JSONContent,
  callback: (node: JSONContent) => void,
): void {
  if (doc.type === "paragraph") {
    callback(doc);
    return;
  }

  if (doc.content) {
    for (const child of doc.content) {
      walkParagraphs(child, callback);
    }
  }
}

/**
 * Check if a text node has a specific mark
 */
function hasMark(node: TextNode, markType: MarkType): boolean {
  return node.marks?.some((m) => m.type === markType) ?? false;
}

/**
 * Get the color from a text node's textStyle mark
 */
function getTextColor(node: TextNode): string | null {
  const textStyleMark = node.marks?.find((m) => m.type === "textStyle");
  const color = (textStyleMark?.attrs?.color as string) ?? null;
  return color ? normalizeColor(color) : null;
}

/**
 * Check if all text nodes in HTML have a specific mark
 * Returns true if all have it, false if none have it, null if mixed
 */
function checkAllHaveMark(html: string, markType: MarkType): boolean | null {
  if (!html.trim()) return false;

  const doc = generateJSON(html, extensions);
  let hasAny = false;
  let allHave = true;
  let textNodeCount = 0;

  walkTextNodes(doc, (node) => {
    textNodeCount++;
    if (hasMark(node, markType)) {
      hasAny = true;
    } else {
      allHave = false;
    }
  });

  if (textNodeCount === 0) return false;
  if (allHave) return true;
  if (!hasAny) return false;
  return null; // mixed
}

/**
 * Get the alignment from HTML content
 */
function getAlignment(html: string): TextAlignment {
  if (!html.trim()) return "left";

  const doc = generateJSON(html, extensions);
  let alignment: TextAlignment = "left";

  walkParagraphs(doc, (paragraph) => {
    const textAlign = paragraph.attrs?.textAlign as TextAlignment | undefined;
    if (textAlign) {
      alignment = textAlign;
    }
  });

  return alignment;
}

/**
 * Get the text color from HTML content (returns first found color)
 */
function getTextColorFromHtml(html: string): string | null {
  if (!html.trim()) return null;

  const doc = generateJSON(html, extensions);
  let color: string | null = null;

  walkTextNodes(doc, (node) => {
    if (color === null) {
      color = getTextColor(node);
    }
  });

  return color;
}

/**
 * Add a mark to all text nodes in HTML
 */
function addMarkInHtml(html: string, markType: MarkType): string {
  if (!html.trim()) return html;

  const doc = generateJSON(html, extensions);

  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? [];
    const existingIndex = marks.findIndex((m) => m.type === markType);

    if (existingIndex === -1) {
      node.marks = [...marks, { type: markType }];
    }
  });

  return generateHTML(doc, extensions);
}

/**
 * Remove a mark from all text nodes in HTML
 */
function removeMarkInHtml(html: string, markType: MarkType): string {
  if (!html.trim()) return html;

  const doc = generateJSON(html, extensions);

  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? [];
    node.marks = marks.filter((m) => m.type !== markType);
  });

  return generateHTML(doc, extensions);
}

/**
 * Set alignment on all paragraphs in HTML
 */
function setAlignmentInHtml(html: string, alignment: TextAlignment): string {
  if (!html.trim()) return html;

  const doc = generateJSON(html, extensions);

  walkParagraphs(doc, (paragraph) => {
    paragraph.attrs = {
      ...paragraph.attrs,
      textAlign: alignment,
    };
  });

  return generateHTML(doc, extensions);
}

/**
 * Set color on all text nodes in HTML
 */
function setColorInHtml(html: string, color: string): string {
  if (!html.trim()) return html;

  const doc = generateJSON(html, extensions);

  walkTextNodes(doc, (node) => {
    const marks = node.marks ?? [];
    const existingIndex = marks.findIndex((m) => m.type === "textStyle");

    if (existingIndex !== -1) {
      // Update existing textStyle mark
      marks[existingIndex] = {
        ...marks[existingIndex],
        attrs: {
          ...marks[existingIndex].attrs,
          color,
        },
      };
      node.marks = marks;
    } else {
      // Add new textStyle mark
      node.marks = [...marks, { type: "textStyle", attrs: { color } }];
    }
  });

  return generateHTML(doc, extensions);
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
export function useTextBatchController(
  entityIds: MaybeRefOrGetter<EntityId[]>,
): TextBatchController {
  const { nextEditorTick } = useEditorContext();
  const textsMap = useComponents(entityIds, Text);

  const state: TextBatchState = {
    hasTextEntities: computed(() => {
      for (const text of textsMap.value.values()) {
        if (text) return true;
      }
      return false;
    }),

    isBold: computed(() => {
      return computeMarkState("bold");
    }),

    isItalic: computed(() => {
      return computeMarkState("italic");
    }),

    isUnderline: computed(() => {
      return computeMarkState("underline");
    }),

    alignment: computed(() => {
      let alignment: TextAlignment | null = null;

      for (const text of textsMap.value.values()) {
        if (!text) continue;

        const contentAlignment = getAlignment(text.content);

        if (alignment === null) {
          alignment = contentAlignment;
        } else if (alignment !== contentAlignment) {
          return null; // mixed
        }
      }

      return alignment ?? "left";
    }),

    color: computed(() => {
      let color: string | null = null;
      let foundAny = false;

      for (const text of textsMap.value.values()) {
        if (!text) continue;

        const contentColor = getTextColorFromHtml(text.content);

        if (!foundAny) {
          color = contentColor;
          foundAny = true;
        } else if (color !== contentColor) {
          return null; // mixed
        }
      }

      return color;
    }),

    fontSize: computed(() => {
      let fontSize: number | null = null;
      let foundAny = false;

      for (const text of textsMap.value.values()) {
        if (!text) continue;

        if (!foundAny) {
          fontSize = text.fontSizePx;
          foundAny = true;
        } else if (fontSize !== text.fontSizePx) {
          return null; // mixed
        }
      }

      return fontSize;
    }),

    fontFamily: computed(() => {
      let fontFamily: string | null = null;
      let foundAny = false;

      for (const text of textsMap.value.values()) {
        if (!text) continue;

        if (!foundAny) {
          fontFamily = text.fontFamily;
          foundAny = true;
        } else if (fontFamily !== text.fontFamily) {
          return null; // mixed
        }
      }

      return fontFamily;
    }),
  };

  function computeMarkState(markType: MarkType): boolean | null {
    let overallState: boolean | null = null;
    let foundAny = false;

    for (const text of textsMap.value.values()) {
      if (!text) continue;

      const contentState = checkAllHaveMark(text.content, markType);

      if (!foundAny) {
        overallState = contentState;
        foundAny = true;
      } else if (overallState !== contentState) {
        return null; // mixed across entities
      }
    }

    return overallState;
  }

  const commands: TextBatchCommands = {
    toggleBold() {
      // If all are bold, remove from all. Otherwise add to all.
      const shouldAdd = state.isBold.value !== true;
      applyToAll((content) =>
        shouldAdd
          ? addMarkInHtml(content, "bold")
          : removeMarkInHtml(content, "bold"),
      );
    },

    toggleItalic() {
      const shouldAdd = state.isItalic.value !== true;
      applyToAll((content) =>
        shouldAdd
          ? addMarkInHtml(content, "italic")
          : removeMarkInHtml(content, "italic"),
      );
    },

    toggleUnderline() {
      const shouldAdd = state.isUnderline.value !== true;
      applyToAll((content) =>
        shouldAdd
          ? addMarkInHtml(content, "underline")
          : removeMarkInHtml(content, "underline"),
      );
    },

    setAlignment(alignment: TextAlignment) {
      applyToAll((content) => setAlignmentInHtml(content, alignment));
    },

    setColor(color: string) {
      applyToAll((content) => setColorInHtml(content, color));
    },

    setFontSize(size: number) {
      const ids = toValue(entityIds);

      nextEditorTick((ctx) => {
        for (const entityId of ids) {
          const text = Text.write(ctx, entityId);
          text.fontSizePx = size;
        }
      });
    },

    setFontFamily(family: string) {
      const ids = toValue(entityIds);

      nextEditorTick((ctx) => {
        for (const entityId of ids) {
          const text = Text.write(ctx, entityId);
          text.fontFamily = family;
        }
      });
    },
  };

  function applyToAll(transform: (content: string) => string): void {
    const ids = toValue(entityIds);

    nextEditorTick((ctx) => {
      for (const entityId of ids) {
        const text = Text.write(ctx, entityId);
        text.content = transform(text.content);
      }
    });
  }

  return {
    state,
    commands,
  };
}
