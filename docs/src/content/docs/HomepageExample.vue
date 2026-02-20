<script setup lang="ts">
import { type Editor, Block, addComponent, createEntity, RankBounds, Synced, Shape } from '@woven-canvas/core'
import { SelectAll } from '@woven-canvas/plugin-selection'
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

function handleReady(editor: Editor) {
  // Create 3 shapes in a row
  editor.nextTick((ctx) => {
    for (let i = 0; i < 3; i++) {
      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: 'rectangle',
        strokeWidth: 4,
        fillRed: 128,
        fillGreen: 0,
        fillBlue: 0,
        fillAlpha: 128,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: [100 + i * 200, 120],
        size: [100, 100],
        rank: RankBounds.genNext(ctx),
      })
    }
  })
}
</script>

<template>
  <WovenCanvas @ready="handleReady">
  </WovenCanvas>
</template>
