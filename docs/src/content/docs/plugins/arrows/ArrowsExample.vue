<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape } from '@woven-canvas/core'
import { WovenCanvas, ElbowArrowTool, SelectTool, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

function handleReady(editor: Editor) {
  // Create shapes to connect with arrows
  editor.nextTick((ctx) => {
    const shapes = [
      { pos: [60, 100], color: { r: 99, g: 102, b: 241 } },
      { pos: [440, 100], color: { r: 236, g: 72, b: 153 } },
      { pos: [220, 220], color: { r: 34, g: 197, b: 94 } },
    ]

    for (const shape of shapes) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: 'rectangle',
        strokeWidth: 2,
        fillRed: shape.color.r,
        fillGreen: shape.color.g,
        fillBlue: shape.color.b,
        fillAlpha: 200,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: shape.pos as [number, number],
        size: [80, 60],
        rank: RankBounds.genNext(ctx),
      })
    }
  })
}
</script>

<template>
  <WovenCanvas
    @ready="handleReady"
    :plugin-options="{ controls: false, eraser: false, pen: false }"
    :controls="{ leftMouseTool: 'elbow-arrow' }"
  >
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <ElbowArrowTool />
      </Toolbar>
    </template>
  </WovenCanvas>
</template>
