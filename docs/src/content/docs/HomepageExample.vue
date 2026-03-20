<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import rawInitialState from './initialState.json'

// Compute content bounding box from block positions/sizes
let minX = Infinity
let minY = Infinity
let maxX = -Infinity
let maxY = -Infinity

for (const [key, value] of Object.entries(rawInitialState)) {
  if (!key.endsWith('/block')) continue
  const block = value as unknown as { position: [number, number]; size: [number, number] }
  minX = Math.min(minX, block.position[0])
  minY = Math.min(minY, block.position[1])
  maxX = Math.max(maxX, block.position[0] + block.size[0])
  maxY = Math.max(maxY, block.position[1] + block.size[1])
}

const contentWidth = maxX - minX
const contentHeight = maxY - minY
const centerX = (minX + maxX) / 2
const centerY = (minY + maxY) / 2

const containerRef = ref<HTMLElement | null>(null)
const initialState = ref<Record<string, any> | null>(null)

onMounted(() => {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const screenWidth = rect.width
  const screenHeight = rect.height

  let zoom = Math.min(screenWidth / contentWidth, screenHeight / contentHeight)
  zoom /= 1.5 // padding

  initialState.value = {
    ...rawInitialState,
    'SINGLETON/camera': {
      ...rawInitialState['SINGLETON/camera'],
      zoom,
      left: centerX - screenWidth / zoom / 2,
      top: centerY - screenHeight / zoom / 2,
    },
  }
})
</script>

<template>
  <div ref="containerRef" style="width: 100%; height: 100%">
    <WovenCanvas
      v-if="initialState"
      :background="{ kind: 'dots' }"
      :store="{
        persistence: {
          documentId: 'homepage'
        }
      }"
      :initialState="initialState"
    >
    </WovenCanvas>
  </div>
</template>
