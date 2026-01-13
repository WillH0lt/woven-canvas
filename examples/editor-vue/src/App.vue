<script setup lang="ts">
import { shallowRef } from "vue";
import { Editor, Color } from "@infinitecanvas/editor";
import { Store } from "@infinitecanvas/store";
import { InfiniteCanvas, FloatingMenuBar, Toolbar } from "@infinitecanvas/vue";

import { Shape } from "./Shape";
import ShapeBlock from "./components/ShapeBlock.vue";
import BorderButton from "./components/BorderButton.vue";
import ShapeTool from "./components/ShapeTool.vue";

const editorRef = shallowRef<Editor | null>(null);

// Create store for persistence and sync
const store = new Store({
  documentId: "editor-vue-demo",
  useLocalPersistence: true,
});

function handleReady(editor: Editor) {
  editorRef.value = editor;
}
</script>

<template>
  <div class="editor ic-theme-light">
    <InfiniteCanvas
      @ready="handleReady"
      :store="store"
      :controls="{ minZoom: 0.1, maxZoom: 10 }"
      :components="[Shape]"
      :blockDefs="[
        {
          tag: 'shape',
          components: [Shape, Color],
          resizeMode: 'free',
        },
      ]"
    >
      <template #block:shape="{ entityId }">
        <ShapeBlock :entityId="entityId" />
      </template>

      <template #floating-menu>
        <FloatingMenuBar>
          <template #button:shape="{ entityIds }">
            <BorderButton :entityIds="entityIds" />
          </template>
        </FloatingMenuBar>
      </template>

      <template #toolbar>
        <Toolbar>
          <template #tool:shape>
            <ShapeTool />
          </template>
        </Toolbar>
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
  background: white;
}
</style>
