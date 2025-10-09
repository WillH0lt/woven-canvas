<template>
  <div class="absolute inset-0 overflow-hidden" ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { InfiniteCanvas } from "@infinitecanvas/core";
import { ControlsExtension } from "@infinitecanvas/extension-controls";
import { EraserExtension } from "@infinitecanvas/extension-eraser";
import { onMounted, ref } from "vue";

import { AsciiExtension } from "./extensions/ascii";

const canvasContainer = ref<HTMLDivElement | null>(null);

const fontData = {
  atlasPath: "/fonts/courierPrime/atlas.png",
  atlasGrid: [25, 15] as const,
  atlasCellSize: [42, 71] as const,
  clearCharIndex: 94, // space
  clearColor: 0x00000000,
  lineSpacing: 0.63, // magic number based on visual alignment
  charAdvance: 0.52, // magic number based on visual alignment
  charShiftLeft: 0,
  charShiftTop: 0,
  unicodeMapPath: "/fonts/courierPrime/unicodeMap.json",
  backgroundColor: "#ffffff",
};

onMounted(async () => {
  await InfiniteCanvas.New(canvasContainer.value!, {
    extensions: [AsciiExtension(fontData), ControlsExtension, EraserExtension],
    persistenceKey: "asciiLand-example",
    background: {
      enabled: true,
      kind: "dots",
      // color: 0x202020,
    },
    grid: {
      colWidth: 14.5,
      rowHeight: 29,
    },
    fontMenu: {
      families: [
        {
          name: "Courier Prime Sans",
          url: "https://storage.googleapis.com/asciinotes-com-fonts/courierPrimeSans/style.css",
          previewImage:
            "https://storage.googleapis.com/scrolly-page-fonts/CourierPrime.png",
          selectable: true,
        },
      ],
    },
  });
});
</script>
