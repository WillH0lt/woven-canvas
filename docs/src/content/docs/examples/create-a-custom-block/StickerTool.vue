<script setup lang="ts">
import { ToolbarButton } from '@woven-canvas/vue'

// Snapshot defines what gets created when the tool is used
// Note: position and rank are set automatically, so we only need tag and size
const snapshot = JSON.stringify({
  block: {
    tag: 'sticker',
    size: [120, 120],
  },
  sticker: {
    emoji: '😀',
  },
})
</script>

<template>
  <ToolbarButton name="sticker" tooltip="Sticker" :placement-snapshot="snapshot" :drag-out-snapshot="snapshot">
    <span style="font-size: 20px; line-height: 1">😀</span>
  </ToolbarButton>
</template>
