<script setup lang="ts">
import {
  type Editor,
  Block,
  Shape,
  addComponent,
  createEntity,
  RankBounds,
  Synced,
  defineQuery,
  Aabb,
} from '@woven-canvas/core'
import { WovenCanvas, SelectTool, ShapeTool, TextTool } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref } from 'vue'
import html2canvas from 'html2canvas'

const editorRef = ref<Editor | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const previewUrl = ref<string | null>(null)

const blocksQuery = defineQuery((q) => q.with(Synced, Block, Aabb))

function handleReady(editor: Editor) {
  editorRef.value = editor

  // Create some content to export
  editor.nextTick((ctx) => {
    const shapes = [
      { position: [80, 80], size: [100, 80], color: [59, 130, 246], kind: 'rectangle' as const },
      { position: [220, 100], size: [80, 80], color: [239, 68, 68], kind: 'ellipse' as const },
      { position: [130, 200], size: [120, 60], color: [34, 197, 94], kind: 'rectangle' as const },
      { position: [280, 180], size: [60, 100], color: [234, 179, 8], kind: 'ellipse' as const },
    ]

    for (const config of shapes) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: config.kind,
        strokeWidth: 2,
        fillRed: config.color[0],
        fillGreen: config.color[1],
        fillBlue: config.color[2],
        fillAlpha: 220,
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

async function exportAsImage() {
  if (!containerRef.value) return

  // Find the canvas element inside the container
  const canvasWrapper = containerRef.value.querySelector('.ic-root')
  if (!canvasWrapper) return

  try {
    // Use html2canvas to capture the canvas
    const canvas = await html2canvas(canvasWrapper as HTMLElement, {
      backgroundColor: '#1a1a2e',
      scale: 2, // Higher resolution
      logging: false,
    })

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png')
    previewUrl.value = dataUrl
  } catch (error) {
    console.error('Export failed:', error)
  }
}

function downloadImage() {
  if (!previewUrl.value) return

  const link = document.createElement('a')
  link.href = previewUrl.value
  link.download = 'canvas-export.png'
  link.click()
}

function closePreview() {
  previewUrl.value = null
}
</script>

<template>
  <div ref="containerRef" class="export-container">
    <WovenCanvas @ready="handleReady">
      <template #toolbar>
        <div class="toolbar">
          <SelectTool />
          <ShapeTool />
          <TextTool />
        </div>
      </template>
      <template #floating-menu>
        <div class="controls">
          <button @click="exportAsImage">Export as PNG</button>
        </div>
      </template>
    </WovenCanvas>

    <!-- Preview modal -->
    <div v-if="previewUrl" class="preview-overlay" @click="closePreview">
      <div class="preview-modal" @click.stop>
        <div class="preview-header">
          <span>Export Preview</span>
          <button class="close-btn" @click="closePreview">×</button>
        </div>
        <img :src="previewUrl" alt="Canvas export" class="preview-image" />
        <div class="preview-actions">
          <button @click="downloadImage">Download PNG</button>
          <button @click="closePreview">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-container {
  position: relative;
  width: 100%;
  height: 100%;
}

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

.controls button:hover {
  background: #4b5563;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.preview-modal {
  background: #1f2937;
  border-radius: 12px;
  overflow: hidden;
  max-width: 90%;
  max-height: 90%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #374151;
  color: white;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: white;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  display: block;
}

.preview-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  justify-content: flex-end;
}

.preview-actions button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #374151;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.preview-actions button:first-child {
  background: #3b82f6;
}

.preview-actions button:hover {
  opacity: 0.9;
}
</style>
