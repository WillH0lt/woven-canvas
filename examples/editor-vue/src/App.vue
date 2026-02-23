<script setup lang="ts">
import Editor from './Editor.vue'
</script>

<template>
  <div class="container">
    <Editor class="studio"></Editor>
    <!-- <Editor class="studio"></Editor> -->
  </div>
</template>

<style scoped>
.container {
  display: flex;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
}

.studio {
  flex: 1;
  height: 100%;
  position: relative;
  background: white;
  border-right: 5px solid black;
}

.studio:last-child {
  border-right: none;
}
</style>
