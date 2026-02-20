<script setup lang="ts">
import { ToolbarButton } from '@woven-canvas/vue'

// Snapshot defines what gets created when the tool is used
const snapshot = JSON.stringify({
  block: {
    tag: 'tnt',
    size: [80, 80],
  },
  tnt: {
    blastRadius: 100,
  },
})
</script>

<template>
  <ToolbarButton name="tnt" tooltip="TNT (Space to explode)" :placement-snapshot="snapshot" :drag-out-snapshot="snapshot">
    <span style="font-size: 20px; line-height: 1">🧨</span>
  </ToolbarButton>
</template>
