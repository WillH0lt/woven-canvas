<script setup lang="ts">
import {
  type Editor,
  Block,
  Shape,
  addComponent,
  createEntity,
  removeEntity,
  RankBounds,
  Synced,
  defineQuery,
  defineCommand,
  on,
  Key,
  Camera,
  Screen,
  Aabb,
  type Keybind,
} from '@woven-canvas/core'
import { WovenCanvas, SelectTool, ShapeTool } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref } from 'vue'

// Define custom commands
const ZoomToFitCommand = defineCommand('zoom-to-fit')
const AddRandomShapeCommand = defineCommand('add-random-shape')
const DeleteAllCommand = defineCommand('delete-all')

// Query for synced blocks
const syncedBlocksQuery = defineQuery((q) => q.with(Synced, Block, Aabb))

// Custom keybinds
const customKeybinds: Keybind[] = [
  // Cmd/Ctrl + 0: Zoom to fit
  { command: 'zoom-to-fit', key: Key.Digit0, mod: true },
  // Cmd/Ctrl + Shift + N: Add random shape
  { command: 'add-random-shape', key: Key.N, mod: true, shift: true },
  // Cmd/Ctrl + Shift + Backspace: Delete all
  { command: 'delete-all', key: Key.Backspace, mod: true, shift: true },
]

const lastAction = ref<string | null>(null)

function handleReady(editor: Editor) {
  // Register command handlers
  editor.nextTick((ctx) => {
    // Zoom to fit command
    on(ctx, ZoomToFitCommand, (ctx) => {
      const entities = syncedBlocksQuery.current(ctx)
      if (entities.length === 0) return

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      for (const entityId of entities) {
        const aabb = Aabb.read(ctx, entityId)
        minX = Math.min(minX, aabb.value[0])
        minY = Math.min(minY, aabb.value[1])
        maxX = Math.max(maxX, aabb.value[2])
        maxY = Math.max(maxY, aabb.value[3])
      }

      const padding = 50
      minX -= padding
      minY -= padding
      maxX += padding
      maxY += padding

      const screen = Screen.read(ctx)
      const contentWidth = maxX - minX
      const contentHeight = maxY - minY
      const zoom = Math.min(screen.width / contentWidth, screen.height / contentHeight, 2)

      const camera = Camera.write(ctx)
      camera.zoom = zoom
      camera.left = minX - (screen.width / zoom - contentWidth) / 2
      camera.top = minY - (screen.height / zoom - contentHeight) / 2

      lastAction.value = 'Zoomed to fit (Cmd/Ctrl + 0)'
    })

    // Add random shape command
    on(ctx, AddRandomShapeCommand, (ctx) => {
      const colors = [
        [59, 130, 246],
        [239, 68, 68],
        [34, 197, 94],
        [234, 179, 8],
        [168, 85, 247],
      ]
      const color = colors[Math.floor(Math.random() * colors.length)]
      const x = 50 + Math.random() * 300
      const y = 50 + Math.random() * 200

      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: Math.random() > 0.5 ? 'rectangle' : 'ellipse',
        strokeWidth: 2,
        fillRed: color[0],
        fillGreen: color[1],
        fillBlue: color[2],
        fillAlpha: 200,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: [x, y],
        size: [60 + Math.random() * 60, 60 + Math.random() * 60],
        rank: RankBounds.genNext(ctx),
      })

      lastAction.value = 'Added shape (Cmd/Ctrl + Shift + N)'
    })

    // Delete all command
    on(ctx, DeleteAllCommand, (ctx) => {
      const entities = [...syncedBlocksQuery.current(ctx)]
      for (const entityId of entities) {
        removeEntity(ctx, entityId)
      }
      lastAction.value = 'Deleted all (Cmd/Ctrl + Shift + Backspace)'
    })

    // Create initial shapes
    for (let i = 0; i < 3; i++) {
      AddRandomShapeCommand.spawn(ctx)
    }
    lastAction.value = null
  })
}
</script>

<template>
  <WovenCanvas :editor="{ keybinds: customKeybinds }" @ready="handleReady">
    <template #toolbar>
      <div class="toolbar">
        <SelectTool />
        <ShapeTool />
      </div>
    </template>
    <template #floating-menu>
      <div class="shortcuts-panel">
        <div class="shortcut-title">Keyboard Shortcuts</div>
        <div class="shortcut-row">
          <kbd>Cmd/Ctrl</kbd> + <kbd>0</kbd>
          <span>Zoom to fit</span>
        </div>
        <div class="shortcut-row">
          <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
          <span>Add shape</span>
        </div>
        <div class="shortcut-row">
          <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>⌫</kbd>
          <span>Delete all</span>
        </div>
        <div v-if="lastAction" class="last-action">{{ lastAction }}</div>
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

.shortcuts-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #1f2937;
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 13px;
  z-index: 100;
}

.shortcut-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #9ca3af;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.shortcut-row span {
  margin-left: auto;
  color: #9ca3af;
}

kbd {
  background: #374151;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
}

.last-action {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #374151;
  color: #22c55e;
  font-size: 12px;
}
</style>
