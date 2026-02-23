<script setup lang="ts">
import { ref } from "vue";
import { Camera, Screen } from "@woven-canvas/core";
import { CursorKind } from "../../cursors";

import { useTooltipSingleton } from "../../composables/useTooltipSingleton";
import { useEditorContext } from "../../composables/useEditorContext";
import { useToolbar } from "../../composables/useToolbar";
import { useImageCreation } from "../../composables/useImageCreation";

const { nextEditorTick } = useEditorContext();
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();
const { setTool } = useToolbar();
const { createImageBlock } = useImageCreation();

const buttonRef = ref<HTMLButtonElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

function handleClick() {
  // Open file picker
  fileInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Reset input so same file can be selected again
  input.value = "";

  // Validate it's an image
  if (!file.type.startsWith("image/")) {
    console.warn("Selected file is not an image");
    return;
  }

  // Get viewport center in world coordinates
  const ctx = await nextEditorTick();
  const camera = Camera.read(ctx);
  const screen = Screen.read(ctx);
  const centerX = camera.left + screen.width / camera.zoom / 2;
  const centerY = camera.top + screen.height / camera.zoom / 2;

  // Create image at viewport center
  await createImageBlock(file, centerX, centerY);

  // Switch to select tool
  setTool("select", undefined, CursorKind.Select);
}

function handleMouseEnter() {
  if (buttonRef.value) {
    showTooltip("Image", buttonRef.value);
  }
}

function handleMouseLeave() {
  hideTooltip();
}
</script>

<template>
  <button
    ref="buttonRef"
    class="wov-toolbar-button"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />
  </button>
</template>
