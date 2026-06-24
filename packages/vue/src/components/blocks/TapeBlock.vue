<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted } from 'vue'
import { Asset, Image, UploadState } from '@woven-canvas/core'
import type { ResolveDimensions } from '@woven-canvas/asset-sync'

import type { BlockData } from '../../types'
import { useComponent } from '../../composables/useComponent'
import { bucketPx } from '../../helpers/assetDimensions'
import { WOVEN_CANVAS_KEY } from '../../injection'

const props = defineProps<BlockData>()

const injectedContext = inject(WOVEN_CANVAS_KEY)
if (!injectedContext) {
  throw new Error('TapeBlock must be used within a WovenCanvas component')
}
const canvasContext = injectedContext

const asset = useComponent(props.entityId, Asset)
const image = useComponent(props.entityId, Image)

// A tape repeats horizontally at `background-size: auto 100%`, so one tile is
// displayed at the block's height tall and `height × aspect` wide. Size the
// requested variant to that displayed tile — not the looped strip length, and not
// the full source — so a high-res strip shown thin doesn't fetch its full
// resolution. Height is clamped to the source (bucketPx), which keeps the derived
// width ≤ the source too (no upscale). Falls back to bucketing the block width
// when the intrinsic size isn't known yet.
function currentDimensions(): ResolveDimensions {
  const intrinsicWidth = image.value?.width ?? 0
  const intrinsicHeight = image.value?.height ?? 0
  const height = bucketPx(props.block.size[1], intrinsicHeight)
  if (intrinsicWidth <= 0 || intrinsicHeight <= 0) {
    return { width: bucketPx(props.block.size[0]), height }
  }
  return { width: Math.ceil(height * (intrinsicWidth / intrinsicHeight)), height }
}

// Resolve the initial URL during setup so it's available for SSR
const assetManagerForSetup = canvasContext.getAssetManager()
const initialAsset = asset.value
let initialUrl: string | null = null
if (assetManagerForSetup && initialAsset?.identifier) {
  initialUrl = await assetManagerForSetup.getDisplayUrl(initialAsset.identifier, currentDimensions())
}

// The largest height bucket we've already requested; only re-resolve on growth.
// Width is derived from height (× aspect), so tracking height growth covers both.
let requestedHeight = currentDimensions().height

const displayUrl = ref<string | null>(initialUrl)
const isLoading = ref(!initialUrl)
const hasError = ref(false)

let isMounted = true
onUnmounted(() => {
  isMounted = false
})

async function updateDisplayUrl() {
  const assetManager = canvasContext.getAssetManager()
  if (!assetManager) {
    return
  }

  const assetData = asset.value
  if (!assetData || !assetData.identifier) {
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    hasError.value = false

    const dims = currentDimensions()
    requestedHeight = dims.height
    const url = await assetManager.getDisplayUrl(assetData.identifier, dims)

    if (!isMounted) return

    if (url) {
      displayUrl.value = url
      isLoading.value = false
    } else if (assetData.uploadState === UploadState.Failed) {
      hasError.value = true
      isLoading.value = false
    }
  } catch (error) {
    if (!isMounted) return
    console.error('Failed to get tape display URL:', error)
    hasError.value = true
    isLoading.value = false
  }
}

watch(
  () => asset.value,
  () => {
    updateDisplayUrl()
  },
  { immediate: true },
)

onMounted(() => {
  updateDisplayUrl()
})

// Re-request a higher-resolution variant when the tape grows taller than the
// bucket we last asked for. Shrinking is ignored.
watch(
  () => props.block.size[1],
  () => {
    if (currentDimensions().height > requestedHeight) {
      updateDisplayUrl()
    }
  },
)
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
