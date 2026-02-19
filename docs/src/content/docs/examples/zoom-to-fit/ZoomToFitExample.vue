<script setup lang="ts">
import {
  type Editor,
  Block,
  addComponent,
  createEntity,
  RankBounds,
  Synced,
  Shape,
  Camera,
  Screen,
  Aabb,
  defineQuery,
} from '@woven-canvas/core'
import { WovenCanvas, useEditorContext, useSingleton } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref } from 'vue'

const editorRef = ref<Editor | null>(null)

// Query for all synced blocks with Aabb
const blocksQuery = defineQuery((q) => q.with(Synced, Block, Aabb))

function handleReady(editor: Editor) {
  editorRef.value = editor

  // Create some scattered shapes
  editor.nextTick((ctx) => {
    const positions = [
      [100, 100],
      [400, 200],
      [200, 400],
      [600, 100],
      [500, 500],
    ]
    const colors = [
      [220, 38, 38],
      [37, 99, 235],
      [22, 163, 74],
      [234, 179, 8],
      [168, 85, 247],
    ]

    for (let i = 0; i < positions.length; i++) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: 'rectangle',
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
  })
}

function zoomToFit() {
  const editor = editorRef.value
  if (!editor) return

  editor.nextTick((ctx) => {
    const entities = blocksQuery.current(ctx)
    if (entities.length === 0) return

    // Calculate bounding box of all blocks
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const entityId of entities) {
      const aabb = Aabb.read(ctx, entityId)
      minX = Math.min(minX, aabb.value[0])
      minY = Math.min(minY, aabb.value[1])
      maxX = Math.max(maxX, aabb.value[2])
      maxY = Math.max(maxY, aabb.value[3])
    }

    // Add padding
    const padding = 50
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    // Calculate zoom to fit content in viewport
    const screen = Screen.read(ctx)
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const zoom = Math.min(screen.width / contentWidth, screen.height / contentHeight, 2)

    // Center the camera on the content
    const camera = Camera.write(ctx)
    camera.zoom = zoom
    camera.left = minX - (screen.width / zoom - contentWidth) / 2
    camera.top = minY - (screen.height / zoom - contentHeight) / 2
  })
}

function resetZoom() {
  const editor = editorRef.value
  if (!editor) return

  editor.nextTick((ctx) => {
    const camera = Camera.write(ctx)
    camera.zoom = 1
    camera.left = 0
    camera.top = 0
  })
}
</script>

<template>
  <WovenCanvas @ready="handleReady">
    <template #floating-menu>
      <div class="controls">
        <button @click="zoomToFit">Zoom to Fit</button>
        <button @click="resetZoom">Reset</button>
      </div>
    </template>
  </WovenCanvas>
</template>

<style scoped>
.controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
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
</style>
