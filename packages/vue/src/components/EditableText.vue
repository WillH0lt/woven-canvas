<script setup lang="ts">
import { computed, ref, shallowRef, watch, onUnmounted, nextTick } from "vue";
import { Text, type EntityId } from "@infinitecanvas/editor";
import { Editor, EditorContent } from "@tiptap/vue-3";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import TiptapText from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { UndoRedo } from "@tiptap/extensions";

import type { BlockData } from "../types";
import { useComponent } from "../composables";

const props = defineProps<BlockData>();

const emit = defineEmits<{
  editEnd: [data: { content: string; width: number; height: number }];
}>();

const text = useComponent(props.entityId, Text);

// Template ref for measuring text dimensions
const editableTextRef = ref<HTMLElement | null>(null);

// Expose ref for parent components that need to measure
defineExpose({ editableTextRef });

// Local content for static display (avoids flash when exiting edit mode)
const displayContent = ref(text.value?.content ?? "");

// Lazy-initialized Tiptap editor (only created when editing)
const editor = shallowRef<Editor | null>(null);

function createEditor(): Editor {
  return new Editor({
    extensions: [
      Document,
      Paragraph,
      TiptapText,
      TextStyle,
      Bold,
      Italic,
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      UndoRedo,
    ],
    content: text.value?.content ?? "",
    editable: true,
    parseOptions: {
      preserveWhitespace: true,
    },
  });
}

// Position caret under mouse when entering edit mode
function handlePointerEnter(event: PointerEvent): void {
  if (!editor.value) return;

  const position = editor.value.view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });

  editor.value
    .chain()
    .focus()
    .setTextSelection(position?.pos ?? 0)
    .run();
}

// Watch for edited state changes - create/destroy editor lazily
watch(
  () => props.edited,
  async (isEdited) => {
    if (isEdited) {
      // Create editor when entering edit mode
      editor.value = createEditor();
      await handleEditStart(editor.value);
    } else if (editor.value) {
      // Save content and destroy editor when exiting edit mode
      handleEditEnd(editor.value);
      editor.value.destroy();
      editor.value = null;
    }
  },
  { immediate: true }
);

async function handleEditStart(editor: Editor): Promise<void> {
  await nextTick();

  // Add one-time listener to position caret under mouse
  const element = editableTextRef.value;
  if (element) {
    const onPointerEnter = (e: PointerEvent) => handlePointerEnter(e);
    element.addEventListener("pointerenter", onPointerEnter, {
      once: true,
    });

    // Remove listener after short delay to prevent cursor jumping
    setTimeout(() => {
      element.removeEventListener("pointerenter", onPointerEnter);
    }, 50);
  }

  // Default focus at start if pointer doesn't enter
  editor.commands.focus("start");
}

function handleEditEnd(editor: Editor): void {
  // Capture content and dimensions synchronously before editor is destroyed
  const content = editor.getHTML();

  // Update display content immediately to avoid flash
  displayContent.value = content;

  let measuredWidth: number = 0;
  let measuredHeight: number = 0;

  if (editableTextRef.value) {
    const proseMirror = editableTextRef.value.querySelector(".ProseMirror");
    if (proseMirror) {
      measuredWidth = (proseMirror as HTMLElement).offsetWidth;
      measuredHeight = (proseMirror as HTMLElement).offsetHeight;
    }
  }

  // Emit event for parent components to handle content and sizing
  emit("editEnd", { content, width: measuredWidth, height: measuredHeight });
}

// Watch for external text content changes (e.g., from undo/redo or sync)
watch(text, (newText) => {
  if (!newText) return;

  if (editor.value) {
    // Sync to active editor
    const currentContent = editor.value.getHTML();
    if (currentContent !== newText.content) {
      editor.value.commands.setContent(newText.content, { emitUpdate: false });
    }
  } else {
    // Sync to static display
    displayContent.value = newText.content;
  }
});

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
    editor.value.destroy();
    editor.value = null;
  }
});
</script>

<template>
  <div
    ref="editableTextRef"
    class="ic-editable-text"
    :style="containerStyle"
    @keydown="handleKeyDown"
    @pointerdown="handlePointerEvent"
    @pointermove="handlePointerEvent"
    @pointerup="handlePointerEvent"
  >
    <!-- Tiptap editor when actively editing -->
    <EditorContent v-if="editor" :editor="editor" />
    <!-- Static HTML render when not editing (no editor overhead) -->
    <div v-else class="tiptap ProseMirror" v-html="displayContent" />
  </div>
</template>

<style>
.ic-editable-text {
  width: 100%;
  display: block;
  color: var(--ic-text-color);
}

.ic-editable-text p {
  margin: 0;
}

.ic-editable-text p:empty::before {
  content: "";
  display: inline-block;
}

.ic-editable-text .ProseMirror {
  outline: none;
}

.ic-editable-text .ProseMirror-focused {
  outline: none;
}
</style>
