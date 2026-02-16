<script setup lang="ts">
import { ref, inject } from "vue";
import {
  Block,
  createEntity,
  addComponent,
  Camera,
  Screen,
  Image,
  Asset,
  UploadState,
  Grid,
} from "@infinitecanvas/core";
import { Synced } from "@woven-ecs/canvas-store";

import { useTooltipSingleton } from "../../composables/useTooltipSingleton";
import { useEditorContext } from "../../composables/useEditorContext";
import { useToolbar } from "../../composables/useToolbar";
import { INFINITE_CANVAS_KEY } from "../../injection";
import { CursorKind } from "../../cursors";

const { nextEditorTick } = useEditorContext();
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();
const { setTool } = useToolbar();

const canvasContext = inject(INFINITE_CANVAS_KEY);
if (!canvasContext) {
  throw new Error("ImageTool must be used within an InfiniteCanvas component");
}

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

  // Get image dimensions
  const dimensions = await getImageDimensions(file);

  // Get asset manager
  const assetManager = canvasContext?.getAssetManager();

  // Create the block entity
  const ctx = await nextEditorTick();

  const camera = Camera.read(ctx);
  const screen = Screen.read(ctx);
  // Calculate center of viewport
  const centerX = camera.left + screen.width / camera.zoom / 2;
  const centerY = camera.top + screen.height / camera.zoom / 2;

  // Scale image to reasonable size (max 400px on longest side)
  const maxSize = 400;
  const scale = Math.min(
    1,
    maxSize / Math.max(dimensions.width, dimensions.height),
  );
  let width = Math.round(dimensions.width * scale);
  let height = Math.round(dimensions.height * scale);

  // Snap size to grid if enabled
  const grid = Grid.read(ctx);
  if (grid.enabled) {
    width = Math.max(grid.colWidth, Math.round(width / grid.colWidth) * grid.colWidth);
    height = Math.max(grid.rowHeight, Math.round(height / grid.rowHeight) * grid.rowHeight);
  }

  // Create entity
  const entityId = createEntity(ctx);

  // Add Block component
  addComponent(ctx, entityId, Block);
  const block = Block.write(ctx, entityId);
  block.tag = "image";
  block.position[0] = centerX - width / 2;
  block.position[1] = centerY - height / 2;
  block.size[0] = width;
  block.size[1] = height;

  // Snap position to grid if enabled
  Grid.snapPosition(ctx, block.position);

  // Generate identifier upfront
  const identifier = crypto.randomUUID();

  // Add Asset component
  addComponent(ctx, entityId, Asset);
  const asset = Asset.write(ctx, entityId);
  asset.identifier = identifier;
  asset.uploadState = UploadState.Pending;

  // Add Image component
  addComponent(ctx, entityId, Image);
  const image = Image.write(ctx, entityId);
  image.width = dimensions.width;
  image.height = dimensions.height;
  image.alt = file.name;

  // Add Synced component
  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  });

  // Switch to select tool
  setTool("select", undefined, CursorKind.Select);

  // Upload if asset manager is available
  if (assetManager) {
    try {
      await assetManager.upload(identifier, file, {
        filename: file.name,
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height,
      });
      const ctx = await nextEditorTick();
      const asset = Asset.write(ctx, entityId);
      asset.uploadState = UploadState.Complete;
    } catch {
      const ctx = await nextEditorTick();
      const asset = Asset.write(ctx, entityId);
      asset.uploadState = UploadState.Failed;
    }
  }
}

function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
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
    class="ic-toolbar-button"
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
  </button>
  <input
    ref="fileInputRef"
    type="file"
    accept="image/*"
    style="display: none"
    @change="handleFileSelect"
  />
</template>
