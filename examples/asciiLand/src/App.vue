<template>
  <div class="absolute inset-0 overflow-hidden" ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { InfiniteCanvas } from "@infinitecanvas/core";
import { ControlsExtension } from "@infinitecanvas/extension-controls";
import { onMounted, ref } from "vue";

import { AsciiExtension } from "./extensions/ascii";
import { TILE_GRID, TILE_SIZE } from "./extensions/ascii/constants";

// const chars = !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~

const canvasContainer = ref<HTMLDivElement | null>(null);

onMounted(async () => {
  await InfiniteCanvas.New(canvasContainer.value!, {
    extensions: [AsciiExtension, ControlsExtension],
    persistenceKey: "asciiLand-example",
    background: {
      enabled: false,
    },
    grid: {
      xSpacing: TILE_SIZE[0] / TILE_GRID[0],
      ySpacing: TILE_SIZE[1] / TILE_GRID[1],
    },
    fontMenu: {
      families: [
        {
          name: "Courier Prime",
          url: "https://fonts.googleapis.com/css2?family=Courier+Prime",
          previewImage:
            "https://storage.googleapis.com/scrolly-page-fonts/CourierPrime.png",
          selectable: true,
        },
      ],
    },
  });
});
</script>
