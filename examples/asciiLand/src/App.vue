<template>
  <div class="absolute inset-0" ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { InfiniteCanvas } from "@infinitecanvas/core";

import { AsciiExtension } from "./extensions/ascii";

// const chars = !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~

const canvasContainer = ref<HTMLDivElement | null>(null);

onMounted(async () => {
  const infiniteCanvas = await InfiniteCanvas.New({
    extensions: [AsciiExtension],
    persistenceKey: "asciiLand-example",
    grid: {
      enabled: true,
    },
    background: {
      kind: "dots",
      subdivisionStep: 5,
    },
  });

  canvasContainer.value!.appendChild(infiniteCanvas.domElement);
});
</script>
