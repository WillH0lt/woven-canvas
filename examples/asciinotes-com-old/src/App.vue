<template>
  <div class="absolute inset-0 overflow-hidden" ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { InfiniteCanvas } from "@infinitecanvas/core";
import { ArrowsExtension } from "@infinitecanvas/extension-arrows";
import { ControlsExtension } from "@infinitecanvas/extension-controls";
import { EraserExtension } from "@infinitecanvas/extension-eraser";
import { InkExtension } from "@infinitecanvas/extension-ink";
import { onMounted, ref } from "vue";

import figlet from "figlet";
import banner from "figlet/fonts/Banner";
import crawford from "figlet/fonts/Crawford";
import cyberlarge from "figlet/fonts/Cyberlarge";
import dotMatrix from "figlet/fonts/Dot Matrix";
import graceful from "figlet/fonts/Graceful";
import graffiti from "figlet/fonts/Graffiti";
import jsStickLetters from "figlet/fonts/Js Stick Letters";
import mini from "figlet/fonts/Mini";
import rectangles from "figlet/fonts/Rectangles";
import roman from "figlet/fonts/Roman";
import standard from "figlet/fonts/Standard";
// import terrace from "figlet/fonts/Terrace";
// import tmplr from "figlet/fonts/Tmplr";

import { AsciiExtension } from "./extensions/ascii";

const figletFonts = [
  {
    name: "StickLetters",
    displayName: "Stick Letters",
    lines: 4,
    font: jsStickLetters,
  },
  {
    name: "Graceful",
    displayName: "Graceful",
    lines: 4,
    font: graceful,
  },
  // {
  //   name: "Tmplr",
  //   displayName: "Tmplr",
  //   lines: 4,
  //   font: tmplr,
  // },
  {
    name: "Cyberlarge",
    displayName: "Cyberlarge",
    lines: 4,
    font: cyberlarge,
  },
  {
    name: "Mini",
    displayName: "Mini",
    lines: 4,
    font: mini,
  },
  // {
  //   name: "Wavy",
  //   displayName: "Wavy",
  //   lines: 4,
  //   font: Wavy,
  // },
  {
    name: "Standard",
    displayName: "Standard",
    lines: 6,
    font: standard,
  },
  {
    name: "Graffiti",
    displayName: "Graffiti",
    lines: 6,
    font: graffiti,
  },
  {
    name: "Rectangles",
    displayName: "Rectangles",
    lines: 6,
    font: rectangles,
  },
  {
    name: "Banner",
    displayName: "Banner",
    lines: 8,
    font: banner,
  },
  // {
  //   name: "BigChief",
  //   displayName: "Big Chief",
  //   lines: 8,
  //   font: bigChief,
  // },
  {
    name: "Crawford",
    displayName: "Crawford",
    lines: 8,
    font: crawford,
  },
  // {
  //   name: "Terrace",
  //   displayName: "Terrace",
  //   lines: 10,
  //   font: terrace,
  // },
  {
    name: "DotMatrix",
    displayName: "Dot Matrix",
    lines: 10,
    font: dotMatrix,
  },
  {
    name: "Roman",
    displayName: "Roman",
    lines: 10,
    font: roman,
  },
];

for (const figletFont of figletFonts) {
  figlet.parseFont(figletFont.name, figletFont.font);
}

const canvasContainer = ref<HTMLDivElement | null>(null);

const fontData = {
  atlasPath: "/fonts/CascadiaMono/atlas.png",
  unicodeMapPath: "/fonts/CascadiaMono/unicodeMap.json",
  atlasGrid: [55, 44] as const,
  atlasCellSize: [37, 45] as const,
  clearColor: 0x00000000,
  lineSpacing: 0.69, // magic number based on visual alignment
  charAdvance: 0.42, // magic number based on visual alignment
  originX: 0.13176470588235292,
  backgroundColor: "#f4f4f4", // jules purple - 1d0245
  highlightColor: "#e0e0ff", // "#f0f0ff",
};

const asciiFonts = [
  {
    fontFamily: "CascadiaMono",
    fontSizePx: 20,
    lineHeight: 1.2,
    letterSpacingEm: 0.0141,
  },
];

for (const figletFont of figletFonts) {
  asciiFonts.push({
    fontFamily: figletFont.name,
    fontSizePx: 24 * figletFont.lines,
    lineHeight: 1,
    letterSpacingEm: 0,
  });
}

const fontFamilies = [
  {
    name: "CascadiaMono",
    displayName: "Cascadia Mono",
    url: "/fonts/CascadiaMono/style.css",
    previewImage:
      "https://storage.googleapis.com/asciinotes-com-fonts/previews2/CascadiaMono.png",
    selectable: true,
  },
];

for (const figletFont of figletFonts) {
  fontFamilies.push({
    name: figletFont.name,
    displayName: figletFont.displayName,
    url: `/fonts/${figletFont.name}/style.css`,
    previewImage: `https://storage.googleapis.com/asciinotes-com-fonts/previews2/${figletFont.name}.png`,
    selectable: true,
  });
}

const shapeStyles = [
  {
    displayName: "+-----+",
    key: "standard",
    horizontalChar: "-",
    verticalChar: "|",
    topLeftCornerChar: "+",
    topRightCornerChar: "+",
    bottomLeftCornerChar: "+",
    bottomRightCornerChar: "+",
  },
  {
    displayName: "╔═════╗",
    key: "doubleLine",
    horizontalChar: "═",
    verticalChar: "║",
    topLeftCornerChar: "╔",
    topRightCornerChar: "╗",
    bottomLeftCornerChar: "╚",
    bottomRightCornerChar: "╝",
  },
  {
    displayName: "╭─────╮",
    key: "rounded",
    horizontalChar: "─",
    verticalChar: "│",
    topLeftCornerChar: "╭",
    topRightCornerChar: "╮",
    bottomLeftCornerChar: "╰",
    bottomRightCornerChar: "╯",
  },
];

onMounted(async () => {
  const infiniteCanvas = await InfiniteCanvas.New(canvasContainer.value!, {
    extensions: [
      ControlsExtension({
        minZoom: 0.75,
      }),
      ArrowsExtension({ elbowArrowPadding: 72 }),
      EraserExtension({ preEraseOpacity: 100 }),
      InkExtension,
      AsciiExtension({ fontData, asciiFonts, shapeStyles }),
    ],
    persistenceKey: "asciinote-com-v0",
    background: {
      enabled: false,
      color: fontData.backgroundColor,
    },
    grid: {
      // needs to be 1:2 ratio
      colWidth: 12,
      rowHeight: 24, // needs to be an integer when divided by 1.2 (line height)
    },
    fontMenu: {
      families: fontFamilies,
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
      {
        tag: "ic-ink-stroke",
        canRotate: false,
        noHtml: true,
      },
    ],
  });
  infiniteCanvas.store.core.blockCount.subscribe((count) => {
    console.log("Block count:", count);
  });
});
</script>
