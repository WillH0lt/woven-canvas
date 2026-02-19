<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape, Camera } from '@woven-canvas/core'
import { WovenCanvas, SelectTool, ShapeTool } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref, computed } from 'vue'

const isCameraLocked = ref(true)
const canvasKey = ref(0)

// Disable controls plugin when camera is locked
const pluginOptions = computed(() =>
  isCameraLocked.value
    ? {
        controls: false as const,
      }
    : {},
)

function handleReady(editor: Editor) {
  editor.nextTick((ctx) => {
    // Create some shapes to interact with
    const colors = [
      [59, 130, 246],
      [239, 68, 68],
      [34, 197, 94],
      [234, 179, 8],
    ]
    const positions = [
      [80, 80],
      [220, 100],
      [120, 220],
      [260, 200],
    ]

    for (let i = 0; i < colors.length; i++) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: i % 2 === 0 ? 'rectangle' : 'ellipse',
        strokeWidth: 2,
        fillRed: colors[i][0],
        fillGreen: colors[i][1],
        fillBlue: colors[i][2],
        fillAlpha: 200,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: positions[i],
        size: [80, 80],
        rank: RankBounds.genNext(ctx),
      })
    }

    // Center camera on content
    const camera = Camera.write(ctx)
    camera.left = 0
    camera.top = 0
    camera.zoom = 1
  })
}

function toggleCameraLock() {
  isCameraLocked.value = !isCameraLocked.value
  canvasKey.value++
}
</script>

<template>
  <WovenCanvas :key="canvasKey" :plugin-options="pluginOptions" @ready="handleReady">
    <template #toolbar>
      <div class="toolbar">
        <SelectTool />
        <ShapeTool />
      </div>
    </template>
    <template #floating-menu>
      <div class="controls">
        <button @click="toggleCameraLock">
          {{ isCameraLocked ? 'Unlock Camera' : 'Lock Camera' }}
        </button>
        <span class="status" :class="{ locked: isCameraLocked }">
          {{ isCameraLocked ? 'Camera Locked' : 'Camera Free' }}
        </span>
      </div>
    </template>
  </WovenCanvas>
</template>

<style scoped>
.toolbar {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #374151;
  border-radius: 8px;
}

.controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 100;
}

.controls button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #374151;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.controls button:hover {
  background: #4b5563;
}

.status {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  background: #22c55e;
  color: white;
}

.status.locked {
  background: #ef4444;
}
</style>
