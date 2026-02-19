<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape } from '@woven-canvas/core'
import { WovenCanvas, HandTool, SelectTool, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

function handleReady(editor: Editor) {
  // Create a grid of shapes to navigate around
  editor.nextTick((ctx) => {
    const colors = [
      { r: 99, g: 102, b: 241 },
      { r: 236, g: 72, b: 153 },
      { r: 34, g: 197, b: 94 },
      { r: 251, g: 146, b: 60 },
    ]

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const entityId = createEntity(ctx)
        const color = colors[(row + col) % colors.length]
        addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
        addComponent(ctx, entityId, Shape, {
          kind: row % 2 === 0 ? 'rectangle' : 'ellipse',
          strokeWidth: 2,
          fillRed: color.r,
          fillGreen: color.g,
          fillBlue: color.b,
          fillAlpha: 180,
        })
        addComponent(ctx, entityId, Block, {
          tag: 'shape',
          position: [50 + col * 100, 50 + row * 100],
          size: [70, 70],
          rank: RankBounds.genNext(ctx),
        })
      }
    }
  })
}
</script>

<template>
  <WovenCanvas @ready="handleReady">
    <Toolbar>
      <SelectTool />
      <HandTool />
    </Toolbar>
  </WovenCanvas>
</template>
