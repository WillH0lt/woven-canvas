<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from "vue";
import {
  Text,
  Block,
  hasComponent,
  type Context,
} from "@infinitecanvas/editor";
import { useEditor, EditorContent, type Editor } from "@tiptap/vue-3";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import TiptapText from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { UndoRedo } from "@tiptap/extensions";
import {
  SelectionStateSingleton,
  TransformHandleKind,
  TransformHandle,
} from "@infinitecanvas/plugin-selection";

import { useComponent, useSingleton } from "../../composables";
import { useEditorContext } from "../../composables/useEditorContext";
import type { BlockData } from "../../types";

const props = defineProps<BlockData>();

const text = useComponent(props.entityId, Text);
const selectionState = useSingleton(SelectionStateSingleton);

const { nextEditorTick } = useEditorContext();

// Template ref for measuring text dimensions
const textBlockRef = ref<HTMLElement | null>(null);

// ResizeObserver to update block height when stretching
let resizeObserver: ResizeObserver | null = null;

function startStretchObserver(ctx: Context) {
  if (!textBlockRef.value) return;

  const proseMirror = textBlockRef.value.querySelector(".ProseMirror");
  if (!proseMirror) return;

  resizeObserver = new ResizeObserver(() => {
    if (!proseMirror) return;

    const newHeight = (proseMirror as HTMLElement).offsetHeight;
    const block = Block.read(ctx, props.entityId);
    if (block.size[1] === newHeight) return;

    const writableBlock = Block.write(ctx, props.entityId);
    writableBlock.size[1] = newHeight;
  });
  resizeObserver.observe(textBlockRef.value);
}

function stopStretchObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

watch(
  selectionState,
  () => {
    nextEditorTick((ctx) => {
      if (!props.selected) {
        stopStretchObserver();
        return;
      }

      const draggedEntity = selectionState.value?.draggedEntity;

      // Clean up if no longer dragging
      if (draggedEntity === null) {
        stopStretchObserver();
        return;
      }

      // Check if this is a stretch handle drag
      if (!hasComponent(ctx, draggedEntity, TransformHandle)) {
        stopStretchObserver();
        return;
      }

      const kind = TransformHandle.read(ctx, draggedEntity).kind;
      if (kind === TransformHandleKind.Stretch) {
        if (!resizeObserver) {
          startStretchObserver(ctx);
        }
      } else {
        stopStretchObserver();
      }
    });
  },
  { immediate: true }
);

// Initialize Tiptap editor
const editor = useEditor({
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
  editable: false,
  parseOptions: {
    preserveWhitespace: true,
  },
});

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

// Watch for edited state changes (and editor becoming ready)
watch(
  [() => props.edited, editor],
  async ([isEdited, editorInstance]) => {
    if (!editorInstance) return;

    editorInstance.setEditable(isEdited);

    if (isEdited) {
      await handleEditStart(editorInstance);
    } else {
      handleEditEnd(editorInstance);
    }
  },
  { immediate: true }
);

async function handleEditStart(editor: Editor): Promise<void> {
  await nextTick();

  // Add one-time listener to position caret under mouse
  const element = textBlockRef.value;
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
  nextEditorTick((ctx) => {
    const textComponent = Text.write(ctx, props.entityId);
    textComponent.content = editor.getHTML();

    if (!textBlockRef.value) return;

    const proseMirror = textBlockRef.value.querySelector(".ProseMirror");
    if (!proseMirror) return;

    const { offsetWidth, offsetHeight } = proseMirror as HTMLElement;
    const block = Block.read(ctx, props.entityId);
    if (block.size[0] === offsetWidth && block.size[1] === offsetHeight) return;

    const writableBlock = Block.write(ctx, props.entityId);
    writableBlock.size = [offsetWidth, offsetHeight];
  });
}

// Watch for external text content changes (e.g., from undo/redo or sync)
watch(
  text,
  (newText) => {
    if (!editor.value || !newText) return;

    const currentContent = editor.value.getHTML();
    if (currentContent !== newText.content) {
      editor.value.commands.setContent(newText.content, { emitUpdate: false });
    }
  },
  { immediate: true }
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
  editor.value?.destroy();
  stopStretchObserver();
});
</script>

<template>
  <div
    ref="textBlockRef"
    class="ic-text-block"
    :style="containerStyle"
    @keydown="handleKeyDown"
    @pointerdown="handlePointerEvent"
    @pointermove="handlePointerEvent"
    @pointerup="handlePointerEvent"
  >
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
.ic-text-block {
  width: 100%;
  display: block;
  color: var(--ic-text-color);
}

.ic-text-block p {
  margin: 0;
}

.ic-text-block p:empty::before {
  content: "";
  display: inline-block;
}

.ic-text-block .ProseMirror {
  outline: none;
}

.ic-text-block .ProseMirror-focused {
  outline: none;
}

.ic-block[data-selected] > .ic-text-block {
  outline: none;
}
</style>
