<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted } from "vue";
import { Editor, Camera } from "@infinitecanvas/editor";
import { Store } from "@infinitecanvas/store";
import { CanvasControlsPlugin } from "@infinitecanvas/plugin-canvas-controls";
import { SelectionPlugin } from "@infinitecanvas/plugin-selection";
import { InfiniteCanvas } from "@infinitecanvas/vue";

import { RectPlugin, createRectBlock } from "./RectPlugin";
import Shape from "./components/Shape.vue";

const containerRef = ref<HTMLDivElement | null>(null);
const editorRef = shallowRef<Editor | null>(null);
let store: Store | null = null;
let animationFrameId: number | null = null;

function loop() {
  editorRef.value?.tick();
  animationFrameId = requestAnimationFrame(loop);
}

onMounted(async () => {
  if (!containerRef.value) return;

  // Create store for persistence and sync
  store = new Store({
    documentId: "editor-vue-demo",
    useLocalPersistence: true,
  });

  // Create editor with plugins
  const editor = new Editor(containerRef.value, {
    store,
    plugins: [
      CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
      SelectionPlugin,
      RectPlugin,
    ],
  });

  await editor.initialize();
  editorRef.value = editor;

  // Start the render loop
  animationFrameId = requestAnimationFrame(loop);

  console.log("Editor ready:", editor);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  editorRef.value?.dispose();
  store?.dispose();
});

function handleUndo() {
  store?.undo();
}

function handleRedo() {
  store?.redo();
}

function addRect() {
  const editor = editorRef.value;
  if (!editor) return;

  editor.nextTick((ctx) => {
    const camera = Camera.read(ctx);
    // Place block in center of current view
    const x = camera.left + 400;
    const y = camera.top + 300;
    createRectBlock(ctx, x, y, 200, 150, 0x4a90d9ff);
  });
}
</script>

<template>
  <div class="editor" ref="containerRef">
    <div class="toolbar">
      <button @click="addRect">Add Rect</button>
      <button @click="handleUndo">Undo</button>
      <button @click="handleRedo">Redo</button>
    </div>
    <InfiniteCanvas v-if="editorRef" :editor="editorRef">
      <template #rect="{ entityId }">
        <Shape class="rect-block" :entityId="entityId" />
      </template>
    </InfiniteCanvas>
  </div>
</template>

<style scoped>
.editor {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
  display: flex;
  gap: 8px;
}

.toolbar button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #333;
  color: white;
  cursor: pointer;
}

.toolbar button:hover {
  background: #555;
}

.rect-block {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
