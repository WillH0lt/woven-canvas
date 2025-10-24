<template>
  <div class="absolute inset-0 overflow-hidden" ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { InfiniteCanvas } from "@infinitecanvas/core";
import { ArrowsExtension } from "@infinitecanvas/extension-arrows";
import { ControlsExtension } from "@infinitecanvas/extension-controls";
import { EraserExtension } from "@infinitecanvas/extension-eraser";
import { onMounted, ref } from "vue";

import figlet from "figlet";
import graffiti from "figlet/fonts/Graffiti";
import standard from "figlet/fonts/Standard";

import { AsciiExtension } from "./extensions/ascii";

figlet.parseFont("Standard", standard);
figlet.parseFont("Graffiti", graffiti);

const canvasContainer = ref<HTMLDivElement | null>(null);

const fontData = {
  atlasPath: "/fonts/courierPrime/atlas.png",
  unicodeMapPath: "/fonts/courierPrime/unicodeMap.json",
  atlasGrid: [21, 18] as const,
  atlasCellSize: [37, 45] as const,
  clearColor: 0x00000000,
  lineSpacing: 0.9, // magic number based on visual alignment
  charAdvance: 0.5, // magic number based on visual alignment
  charShiftLeft: 0,
  charShiftTop: 0,
  backgroundColor: "#ffffff", // jules purple - 1d0245
};

const asciiFonts = [
  {
    fontFamily: "Courier Prime Sans",
    fontSize: 20,
    lineHeight: 1.2,
  },
  {
    fontFamily: "Standard",
    fontSize: 144,
    lineHeight: 1,
  },
  {
    fontFamily: "Graffiti",
    fontSize: 144,
    lineHeight: 1,
  },
];

onMounted(async () => {
  const infiniteCanvas = await InfiniteCanvas.New(canvasContainer.value!, {
    extensions: [
      ControlsExtension,
      ArrowsExtension({ elbowArrowPadding: 48 }),
      EraserExtension({ preEraseOpacity: 100 }),
      AsciiExtension(fontData, asciiFonts),
    ],
    persistenceKey: "asciiLand-example",
    background: {
      enabled: false,
    },
    grid: {
      // needs to be 1:2 ratio
      colWidth: 12,
      rowHeight: 24, // needs to be an integer when divided by 1.2 (line height)
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
        {
          name: "Standard",
          url: "/fonts/standard/style.css",
          previewImage:
            "https://storage.googleapis.com/scrolly-page-fonts/CourierPrime.png",
          selectable: true,
        },
        {
          name: "Graffiti",
          url: "/fonts/graffiti/style.css",
          previewImage:
            "https://storage.googleapis.com/scrolly-page-fonts/CourierPrime.png",
          selectable: true,
        },
      ],
    },
    customBlocks: [
      {
        tag: "ic-text",
        canRotate: false,
        canScale: false,
        noHtml: true,
      },
      {
        tag: "ic-elbow-arrow",
        canRotate: false,
        canScale: false,
        noHtml: true,
      },
    ],
  });
  infiniteCanvas.store.core.blockCount.subscribe((count) => {
    console.log("Block count:", count);
  });
});
</script>
