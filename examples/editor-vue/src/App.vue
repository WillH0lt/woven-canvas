<script setup lang="ts">
import { shallowRef } from "vue";
import {
  Editor,
  Camera,
  createEntity,
  addComponent,
  Block,
  Synced,
  Color,
  type Context,
} from "@infinitecanvas/editor";
import { Store } from "@infinitecanvas/store";
import { InfiniteCanvas } from "@infinitecanvas/vue";

import { Shape } from "./Shape";
import ShapeBlock from "./components/Shape.vue";

// Helper to create shape blocks
function createShapeBlock(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number = 0x4a90d9ff
): number {
  const entityId = createEntity(ctx);

  addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() });
  addComponent(ctx, entityId, Block, {
    tag: "shape",
    position: [x, y],
    size: [width, height],
  });
  addComponent(ctx, entityId, Shape, { color });

  return entityId;
}

const editorRef = shallowRef<Editor | null>(null);

// Create store for persistence and sync
const store = new Store({
  documentId: "editor-vue-demo",
  useLocalPersistence: true,
});

function handleReady(editor: Editor) {
  editorRef.value = editor;
}

function addShape() {
  const editor = editorRef.value;
  if (!editor) return;

  editor.nextTick((ctx) => {
    const camera = Camera.read(ctx);
    // Place block in center of current view
    const x = camera.left + 400;
    const y = camera.top + 300;
    createShapeBlock(ctx, x, y, 200, 150, 0x4a90d9ff);
  });
}

function addStickyNote() {
  const editor = editorRef.value;
  if (!editor) return;

  editor.nextTick((ctx) => {
    const camera = Camera.read(ctx);
    const x = camera.left + 400;
    const y = camera.top + 300;

    const entityId = createEntity(ctx);
    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() });
    addComponent(ctx, entityId, Block, {
      tag: "sticky-note",
      position: [x, y],
      size: [195, 195],
    });
    addComponent(ctx, entityId, Color, {
      red: Math.floor(Math.random() * 256),
      green: Math.floor(Math.random() * 256),
      blue: Math.floor(Math.random() * 256),
    });
  });
}
</script>

<template>
  <div class="editor ic-theme-light">
    <div class="toolbar">
      <button @click="addShape">Add Shape</button>
      <button @click="addStickyNote">Add Sticky Note</button>
    </div>
    <InfiniteCanvas
      @ready="handleReady"
      :store="store"
      :controls="{ minZoom: 0.1, maxZoom: 10 }"
      :customComponents="[Shape]"
      :customBlockDefs="[{ tag: 'shape', components: [Shape] }]"
    >
      <template #shape="{ entityId }">
        <ShapeBlock class="shape-block" :entityId="entityId" />
      </template>
    </InfiniteCanvas>
  </div>
</template>

<style scoped>
.editor {
  background-color: white;
  width: 100vw;
  height: 100vh;
  position: relative;
  background: cwhite;
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

.shape-block {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
