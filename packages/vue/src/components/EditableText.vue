<script setup lang="ts">
import { computed, ref, shallowRef, watch, onUnmounted, nextTick } from "vue";
import {
  Text,
  Block,
  Camera,
  Screen,
  Mouse,
  ResetKeyboard,
  removeEntity,
  getBlockDef,
} from "@woven-canvas/core";
import { DeselectAll } from "@woven-canvas/plugin-selection";
import { Editor, EditorContent } from "@tiptap/vue-3";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import TiptapText from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { UndoRedo } from "@tiptap/extensions";

import type { BlockData } from "../types";
import { useComponent, useSingleton, useEditorContext } from "../composables";
import { useTextEditorController } from "../composables/useTextEditorController";
import { computeBlockDimensions } from "../utils/blockDimensions";

interface Props extends BlockData {
  /** The block's outer container element (for floating menu positioning) */
  blockElement: HTMLElement | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  editEnd: [
    data: {
      content: string;
      width: number;
      height: number;
      left: number;
      top: number;
    },
  ];
}>();

const text = useComponent(props.entityId, Text);
const camera = useSingleton(Camera);
const screen = useSingleton(Screen);
const textEditorController = useTextEditorController();
const { nextEditorTick } = useEditorContext();
const mouse = useSingleton(Mouse);

// Template ref for measuring text dimensions
const editableTextRef = ref<HTMLElement | null>(null);

// Expose ref for parent components that need to measure
defineExpose({ editableTextRef });

// Local content for static display (avoids flash when exiting edit mode)
const displayContent = ref(text.value?.content ?? "");

// Lazy-initialized Tiptap editor (only created when editing)
const editor = shallowRef<Editor | null>(null);

// Threshold for auto-wrapping on paste: if pasted text exceeds this many characters, enable constrainWidth
const PASTE_WRAP_CHAR_THRESHOLD = 50;
// Minimum width when auto-wrapping is enabled
const MIN_WRAP_WIDTH = 300;

/**
 * Handle paste events. If pasting a large amount of text and constrainWidth is false,
 * enable constrainWidth so the text wraps instead of extending infinitely.
 */
function handlePaste(_view: unknown, event: ClipboardEvent): boolean {
  const t = text.value;
  if (!t || t.constrainWidth) return false; // Already wrapping, let default handle it

  const pastedText = event.clipboardData?.getData("text/plain") ?? "";

  if (pastedText.length > PASTE_WRAP_CHAR_THRESHOLD) {
    nextEditorTick((ctx) => {
      // Enable constrainWidth so pasted text wraps
      const writableText = Text.write(ctx, props.entityId);
      writableText.constrainWidth = true;

      // Set block width to max of current width or minimum
      const block = Block.read(ctx, props.entityId);
      const newWidth = Math.max(block.size[0], MIN_WRAP_WIDTH);
      const writableBlock = Block.write(ctx, props.entityId);
      writableBlock.size = [newWidth, block.size[1]];

      // Reset keyboard state (Ctrl may be stuck from paste shortcut)
      ResetKeyboard.spawn(ctx);

      // Deselect to commit to undo/redo history
      DeselectAll.spawn(ctx);
    });
  }

  return false; // Let Tiptap handle the actual paste
}

function createEditor(): Editor {
  return new Editor({
    extensions: [
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
        defaultAlignment: text.value?.defaultAlignment ?? "left",
      }),
      UndoRedo,
    ],
    content: text.value?.content ?? "",
    editable: true,
    parseOptions: {
      preserveWhitespace: true,
    },
    editorProps: {
      handlePaste,
    },
  });
}

// Watch for edited state changes - create/destroy editor lazily
watch(
  () => props.edited,
  async (isEdited) => {
    if (isEdited && editableTextRef.value) {
      // Create editor when entering edit mode
      editor.value = createEditor();
      await handleEditStart(editor.value);

      if (!props.blockElement) return;

      // Register editor and elements (used by FloatingMenu for bounds)
      // textElement grows with content, blockElement defines the outer bounds
      textEditorController.register(
        editor.value,
        editableTextRef.value,
        props.blockElement
      );
    } else if (editor.value) {
      // Save content and destroy editor when exiting edit mode
      textEditorController.unregister();
      handleEditEnd(editor.value);
      editor.value.destroy();
      editor.value = null;
    }
  },
  { immediate: true },
);

async function handleEditStart(editor: Editor): Promise<void> {
  // Capture mouse position before any async waits
  const mousePos = mouse.value?.position;
  const screenPos = screen.value;

  await nextTick();

  // Wait for browser to paint the editor content
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const element = editableTextRef.value;
  if (mousePos && screenPos && element) {
    // Convert canvas-relative to viewport coordinates
    const clientX = mousePos[0] + screenPos.left;
    const clientY = mousePos[1] + screenPos.top;

    const position = editor.view.posAtCoords({ left: clientX, top: clientY });
    if (position) {
      editor.chain().focus().setTextSelection(position.pos).run();
      return;
    }
  }

  // Fallback: focus at start
  editor.commands.focus("start");
}

function handleEditEnd(editor: Editor): void {
  // Capture content and dimensions synchronously before editor is destroyed
  let content = editor.getHTML();

  // If content is only HTML tags (no text), treat as empty
  // Text is initialized with empty string, then Tiptap wraps it in <p></p>
  // for undo/redo we need to check if something's actually changed
  const stripped = content.replace(/<[^>]*>/g, "").trim();
  const hasContent = stripped.length > 0;

  if (!hasContent) {
    content = "";
  }

  // Update display content immediately to avoid flash
  displayContent.value = content;

  nextEditorTick((ctx) => {
    const blockDef = getBlockDef(ctx, props.block.tag);
    if (!hasContent && blockDef.editOptions?.removeWhenTextEmpty) {
      // No content and block should be removed when empty - delete it
      // Since entity was never synced, this won't affect undo/redo
      removeEntity(ctx, props.entityId);
      return;
    }

    // Find the measure element: the block component's root (first child of .wov-block)
    // This automatically captures any padding/styling the block adds around the text
    const blockEl = editableTextRef.value?.closest(".wov-block");
    const elementToMeasure =
      (blockEl?.firstElementChild as HTMLElement | null) ??
      editableTextRef.value;
    if (!elementToMeasure) {
      console.warn("EditableText: no element to measure");
      return;
    }

    const dimensions = computeBlockDimensions(
      elementToMeasure,
      camera,
      screen,
    );

    // Emit event for parent components to handle content and sizing
    emit("editEnd", { content, ...dimensions });
  });
}

// Watch for external text content changes (e.g., from undo/redo or sync)
// Only watch the content property specifically, not the entire text object,
// so font size/family changes don't trigger a content sync while editing
watch(
  () => text.value?.content,
  (newContent) => {
    if (newContent === undefined) return;

    if (editor.value) {
      // Sync to active editor
      const currentContent = editor.value.getHTML();
      if (currentContent !== newContent) {
        editor.value.commands.setContent(newContent, { emitUpdate: false });
      }
    } else {
      // Sync to static display
      displayContent.value = newContent;
    }
  },
);

// Computed styles for the text container
const containerStyle = computed(() => {
  const t = text.value;
  if (!t) return {};

  return {
    fontFamily: t.fontFamily,
    fontSize: `${t.fontSizePx}px`,
    lineHeight: t.lineHeight,
    letterSpacing: `${t.letterSpacingEm}em`,
    width: t.constrainWidth ? "100%" : "fit-content",
    whiteSpace: t.constrainWidth ? "pre-wrap" : "pre",
    minWidth: "2px",
    wordBreak: "break-word" as const,
    pointerEvents: props.edited ? ("auto" as const) : ("none" as const),
    userSelect: props.edited ? ("auto" as const) : ("none" as const),
  };
});

// Stop keyboard events from propagating to canvas when editing
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Control" || event.key === "Meta") return;
  event.stopPropagation();
}

// Stop pointer events from propagating when editing
function handlePointerEvent(event: PointerEvent) {
  if (props.edited) {
    event.stopPropagation();
  }
}

onUnmounted(() => {
  if (editor.value) {
    textEditorController.unregister();
    editor.value.destroy();
    editor.value = null;
  }
});
</script>

<template>
  <div
    ref="editableTextRef"
    class="wov-editable-text"
    :style="containerStyle"
    @keydown="handleKeyDown"
    @pointerdown="handlePointerEvent"
    @pointermove="handlePointerEvent"
    @pointerup="handlePointerEvent"
  >
    <!-- Tiptap editor when actively editing -->
    <EditorContent v-if="editor" :editor="editor" />
    <!-- Static HTML render when not editing (no editor overhead) -->
    <div v-else>
      <div class="tiptap ProseMirror" v-html="displayContent" />
    </div>
  </div>
</template>

<style>
.wov-editable-text {
  width: 100%;
  display: block;
  color: #000000;
}

.wov-editable-text p {
  margin: 0;
}

.wov-editable-text p:empty::before {
  content: "";
  display: inline-block;
}

.wov-editable-text .ProseMirror {
  outline: none;
  white-space: inherit;
  word-wrap: break-word;
}

.wov-editable-text .ProseMirror-focused {
  outline: none;
}
</style>
