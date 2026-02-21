<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape } from '@woven-canvas/core'
import { WovenCanvas, SelectTool, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

function handleReady(editor: Editor) {
  // Create some shapes to demonstrate selection
  editor.nextTick((ctx) => {
    const colors = [
      { r: 99, g: 102, b: 241 }, // Indigo
      { r: 236, g: 72, b: 153 }, // Pink
      { r: 34, g: 197, b: 94 }, // Green
    ]

    for (let i = 0; i < 3; i++) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: 'rectangle',
        strokeWidth: 2,
        fillRed: colors[i].r,
        fillGreen: colors[i].g,
        fillBlue: colors[i].b,
        fillAlpha: 200,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: [80 + i * 120, 120],
        size: [80, 80],
        rank: RankBounds.genNext(ctx),
      })
    }
  })
}
</script>

<template>
  <WovenCanvas
    @ready="handleReady"
    :plugin-options="{ controls: false, eraser: false, pen: false, arrows: false }"
  >
    <template #toolbar>
      <Toolbar>
        <SelectTool />
      </Toolbar>
    </template>
  </WovenCanvas>
</template>
