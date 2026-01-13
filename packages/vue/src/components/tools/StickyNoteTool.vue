<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";

const snapshot = JSON.stringify({
  block: {
    tag: "sticky-note",
    size: [195, 195],
  },
  color: {
    red: 255,
    green: 242,
    blue: 117,
  },
});
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
