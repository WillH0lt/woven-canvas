<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted } from "vue";
import { Camera, Screen } from "@woven-canvas/core";
import { useEditorContext } from "../composables/useEditorContext";
import { useImageCreation } from "../composables/useImageCreation";

const props = withDefaults(
  defineProps<{
    /** Maximum size for the longest side of dropped images */
    maxSize?: number;
  }>(),
  {
    maxSize: 400,
  }
);

const { nextEditorTick } = useEditorContext();
const { createImageBlock } = useImageCreation();
const isDragging = ref(false);
let dragCounter = 0;

// Get the container ref from WovenCanvas to listen for drag events on this specific canvas
const containerRef = inject<{ value: HTMLElement | null }>("containerRef");

function handleContainerDragEnter(e: DragEvent) {
  // Only respond to drags with files or images
  if (e.dataTransfer?.types.some(t => t === "Files" || t === "text/uri-list" || t === "text/html")) {
    dragCounter++;
    if (dragCounter === 1) {
      isDragging.value = true;
    }
  }
}

function handleContainerDragLeave() {
  dragCounter--;
  if (dragCounter === 0) {
    isDragging.value = false;
  }
}

function handleContainerDrop() {
  dragCounter = 0;
  isDragging.value = false;
}

onMounted(() => {
  const container = containerRef?.value;
  if (container) {
    container.addEventListener("dragenter", handleContainerDragEnter);
    container.addEventListener("dragleave", handleContainerDragLeave);
    container.addEventListener("drop", handleContainerDrop);
  }
});

onUnmounted(() => {
  const container = containerRef?.value;
  if (container) {
    container.removeEventListener("dragenter", handleContainerDragEnter);
    container.removeEventListener("dragleave", handleContainerDragLeave);
    container.removeEventListener("drop", handleContainerDrop);
  }
});

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault();
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();

  if (!e.dataTransfer) return;

  const dropX = e.clientX;
  const dropY = e.clientY;

  // Try to get image files first
  const files = Array.from(e.dataTransfer.files).filter((file) =>
    file.type.startsWith("image/")
  );

  if (files.length > 0) {
    for (const file of files) {
      await createImageAtPosition(file, dropX, dropY);
    }
    return;
  }

  // Try to get image URL from various data types
  const imageUrl = extractImageUrl(e.dataTransfer);
  if (imageUrl) {
    await createImageFromUrl(imageUrl, dropX, dropY);
  }
}

function extractImageUrl(dataTransfer: DataTransfer): string | null {
  // Try text/uri-list first
  const uriList = dataTransfer.getData("text/uri-list");
  if (uriList) {
    const urls = uriList.split("\n").filter((line) => !line.startsWith("#"));
    const imageUrl = urls.find((url) => isImageUrl(url));
    if (imageUrl) return imageUrl;
  }

  // Try text/html (browsers often include img element when dragging images)
  const html = dataTransfer.getData("text/html");
  if (html) {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }

  // Try plain text (might be a URL)
  const text = dataTransfer.getData("text/plain");
  if (text && isImageUrl(text)) {
    return text;
  }

  return null;
}

function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(pathname)) {
      return true;
    }
    if (url.startsWith("data:image/")) {
      return true;
    }
    return true; // Be permissive - validate when loading
  } catch {
    return false;
  }
}

async function createImageAtPosition(file: File, dropX: number, dropY: number) {
  const ctx = await nextEditorTick();

  // Convert screen coordinates to world coordinates
  const camera = Camera.read(ctx);
  const screen = Screen.read(ctx);
  const worldX = camera.left + (dropX - screen.left) / camera.zoom;
  const worldY = camera.top + (dropY - screen.top) / camera.zoom;

  await createImageBlock(file, worldX, worldY, { maxSize: props.maxSize });
}

async function createImageFromUrl(url: string, dropX: number, dropY: number) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Failed to fetch image from URL:", url);
      return;
    }

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
      console.warn("URL did not return an image:", url);
      return;
    }

    const urlPath = new URL(url).pathname;
    const filename = urlPath.split("/").pop() || "image";

    const file = new File([blob], filename, { type: blob.type });
    await createImageAtPosition(file, dropX, dropY);
  } catch (error) {
    console.warn("Failed to load image from URL:", url, error);
  }
}
</script>

<template>
  <div
    class="wov-image-drop-zone"
    :class="{ 'wov-drag-over': isDragging }"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  />
</template>

<style>
.wov-image-drop-zone {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wov-image-drop-zone.wov-drag-over {
  pointer-events: auto;
  background-color: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgba(59, 130, 246, 0.5);
  z-index: 9999;
}
</style>
