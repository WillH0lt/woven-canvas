<script setup lang="ts">
import { shallowRef, ref } from "vue";
import { Editor, Color, Text, VerticalAlign } from "@infinitecanvas/editor";
import { YjsStore } from "@infinitecanvas/store-yjs";
import { InfiniteCanvas, FloatingMenuBar, Toolbar } from "@infinitecanvas/vue";

import { Shape } from "./Shape";
import ShapeBlock from "./components/ShapeBlock.vue";
import BorderButton from "./components/BorderButton.vue";
import ShapeTool from "./components/ShapeTool.vue";

const ONLINE_STORAGE_KEY = "infinitecanvas-online-mode";

// Load online preference from localStorage (default: true)
const savedOnline = localStorage.getItem(ONLINE_STORAGE_KEY);
const initialOnline = savedOnline !== null ? savedOnline === "true" : true;
const isOnline = ref(initialOnline);

const editorRef = shallowRef<Editor | null>(null);

// Create store for persistence and sync
const store = new YjsStore({
  documentId: "editor-vue-demo-v2",
  websocketUrl: "ws://localhost:1234",
  startOnline: initialOnline,
});

function handleReady(editor: Editor) {
  editorRef.value = editor;
}

function toggleOnline() {
  isOnline.value = !isOnline.value;
  localStorage.setItem(ONLINE_STORAGE_KEY, String(isOnline.value));
  store.setOnline(isOnline.value);
}
</script>

<template>
  <div class="editor ic-theme-light">
    <div class="online-toggle">
      <label>
        <input type="checkbox" :checked="isOnline" @change="toggleOnline" />
        {{ isOnline ? "Online" : "Offline" }}
      </label>
    </div>
    <InfiniteCanvas
      @ready="handleReady"
      :store="store"
      :controls="{ maxZoom: 3 }"
      :components="[Shape]"
      :blockDefs="[
        {
          tag: 'shape',
          components: [Shape, Color, Text, VerticalAlign],
          resizeMode: 'free',
          editOptions: {
            canEdit: true,
          },
        },
      ]"
    >
      <template #block:shape="blockData">
        <ShapeBlock v-bind="blockData" />
      </template>

      <template #floating-menu>
        <FloatingMenuBar>
          <template #button:shape="buttonData">
            <BorderButton v-bind="buttonData" />
          </template>
        </FloatingMenuBar>
      </template>

      <template #toolbar>
        <Toolbar>
          <template #tool:shape="toolData">
            <ShapeTool v-bind="toolData" />
          </template>
        </Toolbar>
      </template>
    </InfiniteCanvas>
  </div>
</template>

<style scoped>
.editor {
  background-color: white;
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
}

.online-toggle {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  user-select: none;
}

.online-toggle label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: black;
}

.online-toggle input[type="checkbox"] {
  cursor: pointer;
}
</style>
