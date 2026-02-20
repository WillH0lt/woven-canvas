<script setup lang="ts">
import { ToolbarButton } from '@woven-canvas/vue'

// Snapshot defines what gets created when the tool is used
const snapshot = JSON.stringify({
  block: {
    tag: 'rock',
    size: [70, 70],
  },
  rock: {
    hardness: 1,
  },
})
</script>

<template>
  <ToolbarButton name="rock" tooltip="Rock" :placement-snapshot="snapshot" :drag-out-snapshot="snapshot">
    <span style="font-size: 20px; line-height: 1">🪨</span>
  </ToolbarButton>
</template>
