<script setup lang="ts">
import '@woven-canvas/vue/style.css'
import { WovenCanvas } from '@woven-canvas/vue'
import { useHead } from '#imports'
import { nextTick as vueNextTick, onMounted, onUnmounted, ref } from 'vue'
import { Camera, type Editor } from '@woven-canvas/core'
import type { CanvasStore } from '@woven-ecs/canvas-store'
import stateJson from './state.json'

// Extract saved camera position for pre-hydration scrolling (before filtering it out)
const ssrCamera = ((stateJson as Record<string, unknown>)['SINGLETON/camera'] as { top: number; left: number }) ?? {
  top: 0,
  left: 0,
}

// Filter out ephemeral entries AND the camera singleton.
// Camera is excluded because store.sync() applies pendingInitialState on the first tick,
// which would overwrite any camera position we set via editor.nextTick().
// Without camera in initialState, the editor starts at (0,0) and our nextTick
// sets it to the pre-hydration scroll position before the first paint.
const initialState = Object.fromEntries(
  Object.entries(stateJson).filter(([key]) => !key.endsWith('/user') && key !== 'SINGLETON/camera'),
)

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en',
  },
  // Inline script that runs at body close (before first paint):
  // 1. Makes .wov-root scrollable and scrolls to the saved camera position
  // 2. Tracks scroll position in a global (survives scroll handler resets)
  // 3. Adds a protective handler that blocks WovenCanvasCore's scroll-to-0,0 handler
  //    via stopImmediatePropagation (our handler is registered first, so it wins)
  script: [
    {
      key: 'canvas-ssr-scroll',
      innerHTML: [
        '(function(){',
        'var r=document.querySelector(".wov-root");',
        'if(!r)return;',
        `r.scrollTop=${ssrCamera.top};r.scrollLeft=${ssrCamera.left};`,
        `window.__ssrScroll={top:${ssrCamera.top},left:${ssrCamera.left},active:true};`,
        'r.addEventListener("scroll",function(e){',
        '  var s=window.__ssrScroll;',
        '  if(!s||!s.active)return;',
        '  e.stopImmediatePropagation();',
        '  s.top=r.scrollTop;s.left=r.scrollLeft;',
        '});',
        '})()',
      ].join(''),
      tagPosition: 'bodyClose',
    },
  ],
})

const wrapperRef = ref<HTMLDivElement | null>(null)
let canvasStore: CanvasStore | null = null

function onReady(editor: Editor, store: CanvasStore) {
  canvasStore = store

  // Read scroll position from the global tracker (reliable even if DOM was reset).
  // The inline script's protective handler has been blocking WovenCanvasCore's
  // scroll-to-0,0 handler via stopImmediatePropagation, so this value is correct.
  const ssrScroll = (window as any).__ssrScroll as { top: number; left: number; active: boolean } | undefined
  const scrollTop = ssrScroll?.top ?? ssrCamera.top
  const scrollLeft = ssrScroll?.left ?? ssrCamera.left

  // Deactivate the protective handler — WovenCanvasCore's handler can take over now
  if (ssrScroll) ssrScroll.active = false

  // Write the scroll-derived camera position into the editor.
  // Runs on the next ECS tick. Since we excluded SINGLETON/camera from initialState,
  // store.sync() has no camera data to overwrite this with.
  editor.nextTick((ctx) => {
    const cam = Camera.write(ctx)
    cam.left = scrollLeft
    cam.top = scrollTop
  })

  // Pipeline: editor tick (sets camera) → Vue reactivity (updates cameraRef) → DOM flush.
  // Keep the .pre-hydration CSS override active until the camera transform is correct in the DOM.
  // rAF waits for the editor tick. vueNextTick waits for Vue to flush the updated transform.
  requestAnimationFrame(() => {
    vueNextTick(() => {
      wrapperRef.value?.classList.remove('pre-hydration')
    })
  })
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
  <div
    ref="wrapperRef"
    class="canvas-container pre-hydration"
  >
    <WovenCanvas
      :initial-state="initialState"
      :store="{ history: true }"
      :plugin-options="{ controls: { maxZoom: 3 } }"
      @ready="onReady"
    >
      <!-- <template #toolbar>
        <span></span>
      </template> -->
    </WovenCanvas>
  </div>
</template>

<style scoped>
.canvas-container {
  width: 100vw;
  height: 100dvh;
}

/*
 * Pre-hydration scrollable canvas.
 *
 * Before JS bootstraps, the canvas is rendered with blocks at their world positions.
 * These overrides make the container natively scrollable so the user can pan around
 * while waiting for hydration. The inline script scrolls to the saved camera position.
 *
 * On @ready, the .pre-hydration class is removed, restoring the editor's
 * transform-based camera. The editor camera is synced to the scroll position
 * so there's no visual jump.
 */
.pre-hydration :deep(.wov-root) {
  overflow: auto !important;
  scrollbar-width: none;
}

.pre-hydration :deep(.wov-root::-webkit-scrollbar) {
  display: none;
}

.pre-hydration :deep(.wov-canvas) {
  position: relative !important;
  transform: none !important;
  min-width: 20000px;
  min-height: 20000px;
}
</style>
