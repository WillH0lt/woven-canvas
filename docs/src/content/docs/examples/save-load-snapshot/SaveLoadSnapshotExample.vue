<script setup lang="ts">
import {
  type Editor,
  Block,
  Shape,
  Text,
  addComponent,
  createEntity,
  removeEntity,
  RankBounds,
  Synced,
  Aabb,
  defineQuery,
  hasComponent,
} from '@woven-canvas/core'
import { WovenCanvas, SelectTool, HandTool, ShapeTool, TextTool } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref } from 'vue'

const editorRef = ref<Editor | null>(null)
const savedSnapshot = ref<string | null>(null)

// Query for all synced blocks (content to export)
const syncedBlocksQuery = defineQuery((q) => q.with(Synced, Block))

function handleReady(editor: Editor) {
  editorRef.value = editor

  // Create initial shapes
  editor.nextTick((ctx) => {
    createShape(ctx, [100, 100], [80, 80], [59, 130, 246])
    createShape(ctx, [220, 150], [100, 60], [239, 68, 68])
  })
}

function createShape(ctx: any, position: number[], size: number[], color: number[]) {
  const entityId = createEntity(ctx)
  addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
  addComponent(ctx, entityId, Shape, {
    kind: 'rectangle',
    strokeWidth: 2,
    fillRed: color[0],
    fillGreen: color[1],
    fillBlue: color[2],
    fillAlpha: 200,
  })
  addComponent(ctx, entityId, Block, {
    tag: 'shape',
    position,
    size,
    rank: RankBounds.genNext(ctx),
  })
  return entityId
}

function exportCanvas() {
  const editor = editorRef.value
  if (!editor) return

  editor.nextTick((ctx) => {
    const entities: any[] = []

    for (const entityId of syncedBlocksQuery.current(ctx)) {
      const entity: any = {
        block: Block.snapshot(ctx, entityId),
      }

      // Export Shape component if present
      if (hasComponent(ctx, entityId, Shape)) {
        entity.shape = Shape.snapshot(ctx, entityId)
      }

      // Export Text component if present
      if (hasComponent(ctx, entityId, Text)) {
        entity.text = Text.snapshot(ctx, entityId)
      }

      entities.push(entity)
    }

    const snapshot = JSON.stringify({ version: 1, entities }, null, 2)
    savedSnapshot.value = snapshot
  })
}

function importCanvas() {
  const editor = editorRef.value
  if (!editor || !savedSnapshot.value) return

  const data = JSON.parse(savedSnapshot.value)

  editor.nextTick((ctx) => {
    // Clear existing content
    for (const entityId of syncedBlocksQuery.current(ctx)) {
      removeEntity(ctx, entityId)
    }

    // Create entities from snapshot
    for (const entityData of data.entities) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })

      // Add Block component
      addComponent(ctx, entityId, Block, {
        ...entityData.block,
        rank: RankBounds.genNext(ctx),
      })

      // Add Shape component if present
      if (entityData.shape) {
        addComponent(ctx, entityId, Shape, entityData.shape)
      }

      // Add Text component if present
      if (entityData.text) {
        addComponent(ctx, entityId, Text, entityData.text)
      }
    }
  })
}

function clearCanvas() {
  const editor = editorRef.value
  if (!editor) return

  editor.nextTick((ctx) => {
    for (const entityId of syncedBlocksQuery.current(ctx)) {
      removeEntity(ctx, entityId)
    }
  })
}

function downloadSnapshot() {
  if (!savedSnapshot.value) return

  const blob = new Blob([savedSnapshot.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'canvas-snapshot.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <WovenCanvas @ready="handleReady">
    <template #toolbar>
      <div class="toolbar">
        <SelectTool />
        <HandTool />
        <ShapeTool />
        <TextTool />
      </div>
    </template>
    <template #floating-menu>
      <div class="controls">
        <button @click="exportCanvas">Export</button>
        <button @click="importCanvas" :disabled="!savedSnapshot">Import</button>
        <button @click="clearCanvas">Clear</button>
        <button @click="downloadSnapshot" :disabled="!savedSnapshot">Download</button>
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

.controls button:hover:not(:disabled) {
  background: #4b5563;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
