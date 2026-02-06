<script setup lang="ts">
import { computed, ref, inject, watch, onMounted, onUnmounted } from "vue";
import { Image, Asset, UploadState } from "@infinitecanvas/editor";

import type { BlockData } from "../../types";
import { useComponent } from "../../composables/useComponent";
import { INFINITE_CANVAS_KEY } from "../../injection";

const props = defineProps<BlockData>();

const injectedContext = inject(INFINITE_CANVAS_KEY);
if (!injectedContext) {
  throw new Error("ImageBlock must be used within an InfiniteCanvas component");
}
const canvasContext = injectedContext;

const asset = useComponent(props.entityId, Asset);
const image = useComponent(props.entityId, Image);

// Display URL - either blob URL for pending uploads or resolved URL
const displayUrl = ref<string | null>(null);
const isLoading = ref(true);
const hasError = ref(false);

// Track if we're mounted for async operations
let isMounted = true;
onUnmounted(() => {
  isMounted = false;
});

async function updateDisplayUrl() {
  const assetManager = canvasContext.getAssetManager();
  if (!assetManager) {
    // No asset manager configured - can't display images
    isLoading.value = false;
    hasError.value = true;
    return;
  }

  const assetData = asset.value;
  if (!assetData) {
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
    hasError.value = false;

    const url = await assetManager.getDisplayUrl(assetData.identifier);

    if (!isMounted) return;

    if (url) {
      displayUrl.value = url;
      isLoading.value = false;
    } else if (assetData.uploadState === UploadState.Failed) {
      hasError.value = true;
      isLoading.value = false;
    }
  } catch (error) {
    if (!isMounted) return;
    console.error("Failed to get display URL:", error);
    hasError.value = true;
    isLoading.value = false;
  }
}

// Update URL when asset changes
watch(
  () => asset.value,
  () => {
    updateDisplayUrl();
  },
  { immediate: true },
);

// Also try to get URL on mount in case asset was already loaded
onMounted(() => {
  updateDisplayUrl();
});

const uploadProgress = computed(() => {
  const assetData = asset.value;
  if (!assetData) return null;

  switch (assetData.uploadState) {
    case UploadState.Pending:
      return "Loading...";
    case UploadState.Uploading:
      return "Loading...";
    case UploadState.Failed:
      return "Failed";
    default:
      return null;
  }
});

const imageStyle = computed(() => ({
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
}));
</script>

<template>
  <div class="ic-image-block">
    <!-- Loading state -->
    <div v-if="isLoading && !displayUrl" class="ic-image-placeholder">
      <span>Loading...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="hasError" class="ic-image-placeholder ic-image-error">
      <span>Failed to load image</span>
    </div>

    <!-- Image -->
    <img
      v-else-if="displayUrl"
      :src="displayUrl"
      :alt="image?.alt || ''"
      :style="imageStyle"
      draggable="false"
    />

    <!-- Upload progress overlay -->
    <div v-if="uploadProgress" class="ic-image-upload-overlay">
      <span class="ic-image-upload-status">{{ uploadProgress }}</span>
    </div>
  </div>
</template>

<style>
.ic-image-block {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ic-image-block img {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.ic-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(128, 128, 128, 0.1);
  border: 1px dashed rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  color: rgba(128, 128, 128, 0.7);
  font-size: 14px;
}

.ic-image-error {
  background-color: rgba(255, 0, 0, 0.05);
  border-color: rgba(255, 0, 0, 0.2);
  color: rgba(255, 0, 0, 0.7);
}

.ic-image-upload-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  text-align: center;
}

.ic-image-upload-status {
  display: inline-block;
}
</style>
