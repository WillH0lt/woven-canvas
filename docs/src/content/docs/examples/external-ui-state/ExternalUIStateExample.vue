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
  Camera,
  type EntityId,
} from '@woven-canvas/core'
import { Selected } from '@woven-canvas/plugin-selection'
import { WovenCanvas, SelectTool, ShapeTool, useSingleton, useQuery } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref, computed, watch } from 'vue'

const editorRef = ref<Editor | null>(null)

// Track shapes created
const shapeEntityIds = ref<EntityId[]>([])

function handleReady(editor: Editor) {
  editorRef.value = editor

  editor.nextTick((ctx) => {
    // Create some shapes
    const configs = [
      { position: [80, 80], size: [100, 80], color: [59, 130, 246], kind: 'rectangle' as const },
      { position: [220, 100], size: [80, 80], color: [239, 68, 68], kind: 'ellipse' as const },
      { position: [130, 200], size: [120, 60], color: [34, 197, 94], kind: 'rectangle' as const },
    ]

    for (const config of configs) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: config.kind,
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
      shapeEntityIds.value.push(entityId)
    }
  })
}
</script>

<template>
  <div class="container">
    <WovenCanvas @ready="handleReady">
      <template #toolbar>
        <div class="toolbar">
          <SelectTool />
          <ShapeTool />
        </div>
      </template>
    </WovenCanvas>

    <!-- External UI panel -->
    <ExternalPanel v-if="editorRef" :editor="editorRef" :shape-ids="shapeEntityIds" />
  </div>
</template>

<!-- External panel component that uses composables -->
<script lang="ts">
import { defineComponent, h, computed as vComputed, type PropType } from 'vue'

const ExternalPanel = defineComponent({
  name: 'ExternalPanel',
  props: {
    editor: { type: Object as PropType<Editor>, required: true },
    shapeIds: { type: Array as PropType<EntityId[]>, required: true },
  },
  setup(props) {
    // Use composables to get reactive state from editor
    const camera = useSingleton(Camera)

    // Query selected blocks
    const selectedBlocks = useQuery([Block, Selected] as const)

    // Compute selection info
    const selectionInfo = vComputed(() => {
      const blocks = selectedBlocks.value
      if (blocks.length === 0) return null

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      for (const { Block: block } of blocks) {
        minX = Math.min(minX, block.position[0])
        minY = Math.min(minY, block.position[1])
        maxX = Math.max(maxX, block.position[0] + block.size[0])
        maxY = Math.max(maxY, block.position[1] + block.size[1])
      }

      return {
        count: blocks.length,
        bounds: {
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY),
        },
      }
    })

    // Function to update camera from external UI
    function setZoom(zoom: number) {
      props.editor.nextTick((ctx) => {
        const cam = Camera.write(ctx)
        cam.zoom = zoom
      })
    }

    function resetCamera() {
      props.editor.nextTick((ctx) => {
        const cam = Camera.write(ctx)
        cam.left = 0
        cam.top = 0
        cam.zoom = 1
      })
    }

    return () =>
      h('div', { class: 'panel' }, [
        h('div', { class: 'panel-section' }, [
          h('div', { class: 'panel-title' }, 'Camera'),
          h('div', { class: 'panel-row' }, [
            h('span', 'Position:'),
            h('span', `${Math.round(camera.value.left)}, ${Math.round(camera.value.top)}`),
          ]),
          h('div', { class: 'panel-row' }, [
            h('span', 'Zoom:'),
            h('span', `${Math.round(camera.value.zoom * 100)}%`),
          ]),
          h('div', { class: 'panel-buttons' }, [
            h('button', { onClick: () => setZoom(0.5) }, '50%'),
            h('button', { onClick: () => setZoom(1) }, '100%'),
            h('button', { onClick: () => setZoom(2) }, '200%'),
            h('button', { onClick: resetCamera }, 'Reset'),
          ]),
        ]),
        h('div', { class: 'panel-section' }, [
          h('div', { class: 'panel-title' }, 'Selection'),
          selectionInfo.value
            ? [
                h('div', { class: 'panel-row' }, [
                  h('span', 'Count:'),
                  h('span', selectionInfo.value.count),
                ]),
                h('div', { class: 'panel-row' }, [
                  h('span', 'Position:'),
                  h('span', `${selectionInfo.value.bounds.x}, ${selectionInfo.value.bounds.y}`),
                ]),
                h('div', { class: 'panel-row' }, [
                  h('span', 'Size:'),
                  h(
                    'span',
                    `${selectionInfo.value.bounds.width} × ${selectionInfo.value.bounds.height}`,
                  ),
                ]),
              ]
            : h('div', { class: 'panel-empty' }, 'No selection'),
        ]),
      ])
  },
})

export { ExternalPanel }
</script>

<style scoped>
.container {
  display: flex;
  width: 100%;
  height: 100%;
}

.container > :first-child {
  flex: 1;
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

.panel {
  width: 200px;
  background: #1f2937;
  padding: 16px;
  color: white;
  font-size: 13px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-title {
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 10px;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.panel-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.panel-row span:first-child {
  color: #9ca3af;
}

.panel-buttons {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.panel-buttons button {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background: #374151;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.panel-buttons button:hover {
  background: #4b5563;
}

.panel-empty {
  color: #6b7280;
  font-style: italic;
}
</style>
