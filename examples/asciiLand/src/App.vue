<template>
  <div class="absolute inset-0" ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { InfiniteCanvas } from "@infinitecanvas/core";

import { AsciiExtension } from "./extensions/ascii";

const canvasContainer = ref<HTMLDivElement | null>(null);

onMounted(async () => {
  const infiniteCanvas = await InfiniteCanvas.New({
    extensions: [AsciiExtension],
  });
  canvasContainer.value!.appendChild(infiniteCanvas.domElement);
});
</script>
