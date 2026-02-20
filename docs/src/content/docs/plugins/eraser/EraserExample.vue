<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape } from '@woven-canvas/core'
import { WovenCanvas, EraserTool, SelectTool, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

function handleReady(editor: Editor) {
  // Create shapes to erase
  editor.nextTick((ctx) => {
    const colors = [
      { r: 99, g: 102, b: 241 },
      { r: 236, g: 72, b: 153 },
      { r: 34, g: 197, b: 94 },
      { r: 251, g: 146, b: 60 },
      { r: 168, g: 85, b: 247 },
      { r: 14, g: 165, b: 233 },
    ]

    for (let i = 0; i < 6; i++) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: i % 2 === 0 ? 'rectangle' : 'ellipse',
        strokeWidth: 2,
        fillRed: colors[i].r,
        fillGreen: colors[i].g,
        fillBlue: colors[i].b,
        fillAlpha: 200,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: [60 + (i % 3) * 120, 80 + Math.floor(i / 3) * 120],
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
    :plugin-options="{ controls: false, pen: false, arrows: false }"
    :controls="{ leftMouseTool: 'eraser' }"
  >
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <EraserTool />
      </Toolbar>
    </template>
  </WovenCanvas>
</template>
