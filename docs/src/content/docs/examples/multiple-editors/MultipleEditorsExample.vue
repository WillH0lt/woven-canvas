<script setup lang="ts">
import { type Editor, Block, Shape, addComponent, createEntity, RankBounds, Synced } from '@woven-canvas/core'
import { WovenCanvas, SelectTool, ShapeTool } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

// Each editor gets unique content on ready
function handleReady1(editor: Editor) {
  editor.nextTick((ctx) => {
    // Blue shapes for editor 1
    const positions = [
      [60, 60],
      [160, 80],
      [100, 160],
    ]
    for (const pos of positions) {
      createShape(ctx, pos, [70, 70], [59, 130, 246], 'rectangle')
    }
  })
}

function handleReady2(editor: Editor) {
  editor.nextTick((ctx) => {
    // Red circles for editor 2
    const positions = [
      [80, 80],
      [180, 100],
      [120, 180],
    ]
    for (const pos of positions) {
      createShape(ctx, pos, [60, 60], [239, 68, 68], 'ellipse')
    }
  })
}

function handleReady3(editor: Editor) {
  editor.nextTick((ctx) => {
    // Green shapes for editor 3
    const positions = [
      [70, 70],
      [170, 90],
      [110, 170],
    ]
    for (const pos of positions) {
      createShape(ctx, pos, [80, 50], [34, 197, 94], 'rectangle')
    }
  })
}

function handleReady4(editor: Editor) {
  editor.nextTick((ctx) => {
    // Yellow shapes for editor 4
    const positions = [
      [90, 90],
      [190, 110],
      [130, 190],
    ]
    for (const pos of positions) {
      createShape(ctx, pos, [55, 55], [234, 179, 8], 'ellipse')
    }
  })
}

function createShape(ctx: any, position: number[], size: number[], color: number[], kind: 'rectangle' | 'ellipse') {
  const entityId = createEntity(ctx)
  addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
  addComponent(ctx, entityId, Shape, {
    kind,
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
}
</script>

<template>
  <div class="grid">
    <div class="editor-cell">
      <div class="editor-label">Editor 1 (Blue)</div>
      <WovenCanvas @ready="handleReady1">
        <template #toolbar>
          <div class="mini-toolbar">
            <SelectTool />
            <ShapeTool />
          </div>
        </template>
      </WovenCanvas>
    </div>

    <div class="editor-cell">
      <div class="editor-label">Editor 2 (Red)</div>
      <WovenCanvas @ready="handleReady2">
        <template #toolbar>
          <div class="mini-toolbar">
            <SelectTool />
            <ShapeTool />
          </div>
        </template>
      </WovenCanvas>
    </div>

    <div class="editor-cell">
      <div class="editor-label">Editor 3 (Green)</div>
      <WovenCanvas @ready="handleReady3">
        <template #toolbar>
          <div class="mini-toolbar">
            <SelectTool />
            <ShapeTool />
          </div>
        </template>
      </WovenCanvas>
    </div>

    <div class="editor-cell">
      <div class="editor-label">Editor 4 (Yellow)</div>
      <WovenCanvas @ready="handleReady4">
        <template #toolbar>
          <div class="mini-toolbar">
            <SelectTool />
            <ShapeTool />
          </div>
        </template>
      </WovenCanvas>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 8px;
  background: #111827;
  box-sizing: border-box;
}

.editor-cell {
  position: relative;
  background: #1f2937;
  border-radius: 8px;
  overflow: hidden;
}

.editor-label {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.mini-toolbar {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 2px;
  padding: 4px;
  background: #374151;
  border-radius: 6px;
}

.mini-toolbar :deep(.ic-toolbar-button) {
  width: 24px;
  height: 24px;
}

.mini-toolbar :deep(.ic-toolbar-button svg) {
  width: 14px;
  height: 14px;
}
</style>
