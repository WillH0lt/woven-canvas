<script setup lang="ts">
import { type Editor, Block, Shape, addComponent, createEntity, RankBounds, Synced, Grid } from '@woven-canvas/core'
import { WovenCanvas, SelectTool, ShapeTool, useSingleton } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref, computed } from 'vue'

const editorRef = ref<Editor | null>(null)

// Grid settings
const gridEnabled = ref(true)
const gridSize = ref(40)
const strictMode = ref(false)

function handleReady(editor: Editor) {
  editorRef.value = editor

  // Initialize grid settings
  editor.nextTick((ctx) => {
    const grid = Grid.write(ctx)
    grid.enabled = gridEnabled.value
    grid.colWidth = gridSize.value
    grid.rowHeight = gridSize.value
    grid.strict = strictMode.value

    // Create some initial shapes
    const shapes = [
      { position: [80, 80], size: [80, 80], color: [59, 130, 246] },
      { position: [200, 120], size: [120, 80], color: [239, 68, 68] },
      { position: [120, 240], size: [80, 120], color: [34, 197, 94] },
    ]

    for (const config of shapes) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: 'rectangle',
        strokeWidth: 2,
        fillRed: config.color[0],
        fillGreen: config.color[1],
        fillBlue: config.color[2],
        fillAlpha: 200,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: config.position,
        size: config.size,
        rank: RankBounds.genNext(ctx),
      })
    }
  })
}

function updateGridEnabled(enabled: boolean) {
  gridEnabled.value = enabled
  editorRef.value?.nextTick((ctx) => {
    const grid = Grid.write(ctx)
    grid.enabled = enabled
  })
}

function updateGridSize(size: number) {
  gridSize.value = size
  editorRef.value?.nextTick((ctx) => {
    const grid = Grid.write(ctx)
    grid.colWidth = size
    grid.rowHeight = size
  })
}

function updateStrictMode(strict: boolean) {
  strictMode.value = strict
  editorRef.value?.nextTick((ctx) => {
    const grid = Grid.write(ctx)
    grid.strict = strict
  })
}
</script>

<template>
  <WovenCanvas
    :editor="{ grid: { enabled: gridEnabled, colWidth: gridSize, rowHeight: gridSize, strict: strictMode } }"
    :background="{ type: 'grid', size: gridSize, color: 'rgba(255,255,255,0.1)' }"
    @ready="handleReady"
  >
    <template #toolbar>
      <div class="toolbar">
        <SelectTool />
        <ShapeTool />
      </div>
    </template>
    <template #floating-menu>
      <div class="grid-controls">
        <div class="control-row">
          <label>
            <input type="checkbox" :checked="gridEnabled" @change="updateGridEnabled(($event.target as HTMLInputElement).checked)" />
            Snap to Grid
          </label>
        </div>

        <div class="control-row">
          <label>Grid Size:</label>
          <div class="size-buttons">
            <button
              v-for="size in [20, 40, 60, 80]"
              :key="size"
              :class="{ active: gridSize === size }"
              @click="updateGridSize(size)"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <div class="control-row">
          <label>
            <input type="checkbox" :checked="strictMode" @change="updateStrictMode(($event.target as HTMLInputElement).checked)" />
            Strict Mode
          </label>
        </div>

        <div class="info">
          <span v-if="gridEnabled">Shapes snap to {{ gridSize }}px grid</span>
          <span v-else>Free positioning</span>
        </div>
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

.grid-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #1f2937;
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 13px;
  z-index: 100;
  min-width: 180px;
}

.control-row {
  margin-bottom: 12px;
}

.control-row:last-child {
  margin-bottom: 0;
}

.control-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.control-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.size-buttons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.size-buttons button {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background: #374151;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.size-buttons button:hover {
  background: #4b5563;
}

.size-buttons button.active {
  background: #3b82f6;
}

.info {
  padding-top: 8px;
  border-top: 1px solid #374151;
  color: #9ca3af;
  font-size: 12px;
}
</style>
