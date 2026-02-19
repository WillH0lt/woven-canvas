<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape, Text } from '@woven-canvas/core'
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref, computed } from 'vue'

const isReadOnly = ref(true)

// Plugin options change based on read-only state
const pluginOptions = computed(() =>
  isReadOnly.value
    ? {
        selection: false as const,
        eraser: false as const,
        pen: false as const,
        arrows: false as const,
      }
    : {},
)

// Key forces remount when toggling read-only
const canvasKey = ref(0)

function handleReady(editor: Editor) {
  editor.nextTick((ctx) => {
    // Create a shape
    const shapeId = createEntity(ctx)
    addComponent(ctx, shapeId, Synced, { id: crypto.randomUUID() })
    addComponent(ctx, shapeId, Shape, {
      kind: 'rectangle',
      strokeWidth: 2,
      fillRed: 59,
      fillGreen: 130,
      fillBlue: 246,
      fillAlpha: 200,
    })
    addComponent(ctx, shapeId, Block, {
      tag: 'shape',
      position: [100, 100],
      size: [120, 80],
      rank: RankBounds.genNext(ctx),
    })

    // Create another shape
    const shape2Id = createEntity(ctx)
    addComponent(ctx, shape2Id, Synced, { id: crypto.randomUUID() })
    addComponent(ctx, shape2Id, Shape, {
      kind: 'ellipse',
      strokeWidth: 2,
      fillRed: 239,
      fillGreen: 68,
      fillBlue: 68,
      fillAlpha: 200,
    })
    addComponent(ctx, shape2Id, Block, {
      tag: 'shape',
      position: [280, 120],
      size: [100, 100],
      rank: RankBounds.genNext(ctx),
    })

    // Create text
    const textId = createEntity(ctx)
    addComponent(ctx, textId, Synced, { id: crypto.randomUUID() })
    addComponent(ctx, textId, Text, {
      content: 'Read-only canvas',
      fontSizePx: 24,
      fontFamily: 'Figtree',
    })
    addComponent(ctx, textId, Block, {
      tag: 'text',
      position: [100, 260],
      size: [250, 40],
      rank: RankBounds.genNext(ctx),
    })
  })
}

function toggleReadOnly() {
  isReadOnly.value = !isReadOnly.value
  // Force remount to apply new plugin options
  canvasKey.value++
}
</script>

<template>
  <WovenCanvas :key="canvasKey" :plugin-options="pluginOptions" @ready="handleReady">
    <template #toolbar>
      <div v-if="!isReadOnly" class="toolbar">
        <!-- Toolbar only shown in edit mode -->
        <span style="color: white; padding: 8px">Edit Mode</span>
      </div>
    </template>
    <template #floating-menu>
      <div class="controls">
        <button @click="toggleReadOnly">
          {{ isReadOnly ? 'Enable Editing' : 'Make Read-Only' }}
        </button>
        <span class="status" :class="{ readonly: isReadOnly }">
          {{ isReadOnly ? 'Read-Only' : 'Editable' }}
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

.status.readonly {
  background: #6b7280;
}
</style>
