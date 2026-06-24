<script setup lang="ts">
import { computed, ref, inject, watch, onMounted, onUnmounted } from 'vue'
import { Image, Asset, UploadState } from '@woven-canvas/core'
import type { ResolveDimensions } from '@woven-canvas/asset-sync'

import type { BlockData } from '../../types'
import { useComponent } from '../../composables/useComponent'
import { bucketPx } from '../../helpers/assetDimensions'
import { WOVEN_CANVAS_KEY } from '../../injection'

const props = defineProps<BlockData>()

const injectedContext = inject(WOVEN_CANVAS_KEY)
if (!injectedContext) {
  throw new Error('ImageBlock must be used within a WovenCanvas component')
}
const canvasContext = injectedContext

const asset = useComponent(props.entityId, Asset)
const image = useComponent(props.entityId, Image)
const assetManager = canvasContext.getAssetManager()

// True when a remote client is currently uploading this asset: the identifier
// is set and uploadState is pending/uploading, but we don't hold the binary
// locally. In this case the provider URL points at an object that doesn't
// exist yet, so rendering it would produce a broken link. Show a spinner and
// wait for uploadState to flip to Complete.
const isRemoteUploading = computed(() => {
  const a = asset.value
  if (!a?.identifier) return false
  if (a.uploadState !== UploadState.Pending && a.uploadState !== UploadState.Uploading) return false
  return !assetManager?.hasPendingUpload(a.identifier)
})

// The device-pixel render target for the current block size, bucketed and
// clamped to the image's intrinsic size. Drives which variant we request.
function currentDimensions(): ResolveDimensions {
  const [w, h] = props.block.size
  return {
    width: bucketPx(w, image.value?.width ?? 0),
    height: bucketPx(h, image.value?.height ?? 0),
  }
}

// The largest bucket we've already requested. We only ever re-resolve when the
// block grows past this — shrinking keeps the higher-res image (CSS scales it
// down), so we never refetch a smaller, lower-quality variant.
const requested = { width: 0, height: 0 }

// Resolve the initial URL during setup so it's available for SSR. Skip if the
// asset is being uploaded remotely — we'll show a spinner until it's ready.
const initialAsset = asset.value
let initialUrl: string | null = null
if (assetManager && initialAsset?.identifier && !isRemoteUploading.value) {
  const dims = currentDimensions()
  requested.width = dims.width
  requested.height = dims.height
  initialUrl = await assetManager.getDisplayUrl(initialAsset.identifier, dims)
}

const displayUrl = ref<string | null>(initialUrl)
const isLoading = ref(!initialUrl)
const hasError = ref(false)

// Track if we're mounted for async operations
let isMounted = true
onUnmounted(() => {
  isMounted = false
})

// Apply a freshly resolved URL. On the first load (no image showing yet) swap
// in directly. On an upgrade, preload the larger variant off-screen and swap
// only once it has decoded, so the visible image never blanks mid-resize.
function applyUrl(url: string) {
  if (typeof window === 'undefined' || !displayUrl.value) {
    displayUrl.value = url
    isLoading.value = false
    return
  }
  const preload = new window.Image()
  preload.onload = () => {
    if (!isMounted) return
    displayUrl.value = url
    isLoading.value = false
  }
  preload.onerror = () => {
    // Keep the current image; just drop the loading flag.
    if (isMounted) isLoading.value = false
  }
  preload.src = url
}

async function updateDisplayUrl() {
  const assetData = asset.value
  if (!assetData) {
    isLoading.value = false
    return
  }

  // Don't try to resolve while a remote upload is in flight. When uploadState
  // flips to Complete the watch re-fires and the img element mounts fresh,
  // which guarantees a new network fetch even if the URL is unchanged.
  if (isRemoteUploading.value) {
    displayUrl.value = null
    isLoading.value = true
    hasError.value = false
    return
  }

  try {
    isLoading.value = true
    hasError.value = false

    const dims = currentDimensions()
    requested.width = dims.width
    requested.height = dims.height
    const url = await assetManager?.getDisplayUrl(assetData.identifier, dims)

    if (!isMounted) return

    if (url) {
      applyUrl(url)
    } else if (assetData.uploadState === UploadState.Failed) {
      hasError.value = true
      isLoading.value = false
    }
  } catch (error) {
    if (!isMounted) return
    console.error('Failed to get display URL:', error)
    hasError.value = true
    isLoading.value = false
  }
}

// Update URL when asset changes
watch(
  () => asset.value,
  () => {
    updateDisplayUrl()
  },
  { immediate: true },
)

// Also try to get URL on mount in case asset was already loaded
onMounted(() => {
  updateDisplayUrl()
})

// Re-request a higher-resolution variant when the block grows past the bucket
// we last asked for. Shrinking is ignored (see `requested`).
watch(
  () => [props.block.size[0], props.block.size[1]] as const,
  () => {
    const dims = currentDimensions()
    if (dims.width > requested.width || dims.height > requested.height) {
      updateDisplayUrl()
    }
  },
)

const imageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'fill' as const,
}))
</script>

<template>
  <div class="wov-image-block">
    <!-- Remote upload in progress: spinner overlay, no <img> in the tree so
         it mounts fresh (and re-fetches) when the upload completes. -->
    <div v-if="isRemoteUploading" class="wov-image-placeholder wov-image-loading">
      <div class="wov-image-spinner" aria-label="Loading image" />
    </div>

    <!-- Local loading state (pre-resolve, e.g. first render before getDisplayUrl returns) -->
    <div v-else-if="isLoading && !displayUrl" class="wov-image-placeholder" />

    <!-- Error state -->
    <div v-else-if="hasError" class="wov-image-placeholder wov-image-error">
      <span>Failed to save image</span>
    </div>

    <!-- Image -->
    <img
      v-else-if="displayUrl"
      :src="displayUrl"
      :alt="image?.alt || ''"
      :style="imageStyle"
      draggable="false"
    />
  </div>
</template>

<style>
.wov-image-block {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.wov-image-block img {
  display: block;
}

.wov-image-placeholder {
  width: 100%;
  height: 100%;
}

.wov-image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.04);
  /* container-type lets the spinner size itself from this block's dimensions
     via cqw/cqh, so it grows to the largest circle that fits the rectangle. */
  container-type: size;
}

.wov-image-spinner {
  /* One third of the largest inscribed circle. */
  width: 33cqmin;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
  /* Border scales gently with the spinner so it stays visible on huge blocks
     without looking chunky on tiny ones. */
  border: max(3px, 1.5cqmin) solid rgba(0, 0, 0, 0.12);
  border-top-color: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  animation: wov-image-spin 0.8s linear infinite;
}

@keyframes wov-image-spin {
  to {
    transform: rotate(360deg);
  }
}

.wov-image-error {
  background-color: rgba(255, 0, 0, 0.05);
  border-color: rgba(255, 0, 0, 0.2);
  color: rgba(255, 0, 0, 0.7);
}

.wov-image-upload-overlay {
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

.wov-image-upload-status {
  display: inline-block;
}
</style>
