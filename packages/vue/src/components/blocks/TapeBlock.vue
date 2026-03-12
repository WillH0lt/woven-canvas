<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted } from "vue";
import { Asset, UploadState } from "@woven-canvas/core";

import type { BlockData } from "../../types";
import { useComponent } from "../../composables/useComponent";
import { WOVEN_CANVAS_KEY } from "../../injection";

const props = defineProps<BlockData>();

const injectedContext = inject(WOVEN_CANVAS_KEY);
if (!injectedContext) {
  throw new Error("TapeBlock must be used within a WovenCanvas component");
}
const canvasContext = injectedContext;

const asset = useComponent(props.entityId, Asset);

const displayUrl = ref<string | null>(null);
const isLoading = ref(true);
const hasError = ref(false);

let isMounted = true;
onUnmounted(() => {
  isMounted = false;
});

async function updateDisplayUrl() {
  const assetManager = canvasContext.getAssetManager();
  if (!assetManager) {
    isLoading.value = false;
    hasError.value = true;
    return;
  }

  const assetData = asset.value;
  if (!assetData || !assetData.identifier) {
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
    console.error("Failed to get tape display URL:", error);
    hasError.value = true;
    isLoading.value = false;
  }
}

watch(
  () => asset.value,
  () => {
    updateDisplayUrl();
  },
  { immediate: true },
);

onMounted(() => {
  updateDisplayUrl();
});
</script>

<template>
  <div class="wov-tape-block">
    <div v-if="isLoading && !displayUrl" class="wov-tape-placeholder" />
    <div
      v-else-if="displayUrl"
      class="wov-tape-image"
      :style="{
        backgroundImage: `url(${displayUrl})`,
      }"
    />
  </div>
</template>

<style>
.wov-tape-block {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
}

.wov-tape-image {
  width: 100%;
  height: 100%;
  background-size: auto 100%;
  background-repeat: repeat-x;
}

.wov-tape-placeholder {
  width: 100%;
  height: 100%;
  background-color: rgba(220, 200, 160, 0.5);
}
</style>
