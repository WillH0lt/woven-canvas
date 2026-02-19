<script setup lang="ts">
import { ToolbarButton } from '@woven-canvas/vue'

// Snapshot defines what gets created when the tool is used
const snapshot = JSON.stringify({
  block: {
    tag: 'sticker',
    size: [120, 120],
  },
  'sticker-data': {
    emoji: '😀',
  },
})
</script>

<template>
  <ToolbarButton name="sticker" tooltip="Sticker" :placement-snapshot="snapshot" :drag-out-snapshot="snapshot">
    <!-- Smiley face icon -->
    <svg viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5" />
      <circle cx="7" cy="8" r="1.2" />
      <circle cx="13" cy="8" r="1.2" />
      <path d="M6 12.5 Q10 15.5 14 12.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </ToolbarButton>
</template>
