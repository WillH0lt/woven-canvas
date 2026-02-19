<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape } from '@woven-canvas/core'
import { WovenCanvas, ArcArrowTool, ElbowArrowTool, SelectTool, Toolbar, ColorButton } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

function handleReady(editor: Editor) {
  // Create shapes to connect with arrows
  editor.nextTick((ctx) => {
    const shapes = [
      { pos: [60, 100], color: { r: 99, g: 102, b: 241 } },
      { pos: [220, 100], color: { r: 236, g: 72, b: 153 } },
      { pos: [140, 220], color: { r: 34, g: 197, b: 94 } },
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
        cornerRadius: 8,
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
  <WovenCanvas @ready="handleReady">
    <Toolbar>
      <SelectTool />
      <ArcArrowTool />
      <ElbowArrowTool />
      <ColorButton />
    </Toolbar>
  </WovenCanvas>
</template>
