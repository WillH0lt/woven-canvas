<script setup lang="ts">
import { computed, inject } from 'vue'
import { VerticalAlignment, TextAlignment } from '@woven-canvas/core'
import ToolbarButton from '../ToolbarButton.vue'
import { WOVEN_CANVAS_KEY } from '../../injection'

const canvasContext = inject(WOVEN_CANVAS_KEY)!

const snapshot = computed(() => {
  return JSON.stringify({
    block: {
      tag: 'sticky-note',
      size: [200, 200],
    },
    color: {
      red: 255,
      green: 242,
      blue: 117,
    },
    text: {
      defaultAlignment: TextAlignment.Center,
      ...canvasContext.getDefaults('text'),
    },
    verticalAlign: {
      value: VerticalAlignment.Center,
    },
  })
})
</script>

<template>
  <ToolbarButton
    name="sticky-note"
    tooltip="Sticky Note"
    :drag-out-snapshot="snapshot"
    :placement-snapshot="snapshot"
  >
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path d="M4 4h12v12H4z" />
      <path d="M7 8h6M7 11h4" />
    </svg>
  </ToolbarButton>
</template>
