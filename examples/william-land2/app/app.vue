<script setup lang="ts">
import '@woven-canvas/vue/style.css'
import { WovenCanvas } from '@woven-canvas/vue'
import { useHead } from '#imports'
import { onMounted, onUnmounted, ref } from 'vue'
import type { Editor } from '@woven-canvas/core'
import type { CanvasStore } from '@woven-ecs/canvas-store'
import stateJson from './state.json'

// Filter out ephemeral entries from initial state
const initialState = Object.fromEntries(Object.entries(stateJson).filter(([key]) => !key.endsWith('/user')))

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en',
  },
})

let canvasStore: CanvasStore | null = null

function onReady(_editor: Editor, store: CanvasStore) {
  canvasStore = store
}

function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    if (canvasStore) {
      console.log(JSON.stringify(canvasStore.getState(), null, 2))
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="canvas-container">
    <WovenCanvas
      :initial-state="initialState"
      :store="{ history: true }"
      :plugin-options="{ controls: { maxZoom: 3 } }"
      @ready="onReady"
    >
    </WovenCanvas>
  </div>
</template>

<style scoped>
.canvas-container {
  width: 100vw;
  height: 100dvh;
}
</style>
