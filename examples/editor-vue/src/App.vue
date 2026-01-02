<script setup lang="ts">
import { InfiniteCanvas } from "@infinitecanvas/vue";
</script>

<template>
  <div class="editor">
    <InfiniteCanvas
      @ready="
        (editor) => {
          console.log('Editor ready:', editor);
        }
      "
      :controls="{ minZoom: 0.1, maxZoom: 10 }"
    >
      <!-- <template #rect="{ block, selected }">
        <div
          class="rect-block"
          :style="{
            width: '100%',
            height: '100%',
            background: selected ? '#2563eb' : '#4a90d9',
            borderRadius: '4px',
          }"
        />
      </template>  -->
    </InfiniteCanvas>
  </div>
</template>

<style scoped>
.editor {
  width: 100vw;
  height: 100vh;
}
</style>
