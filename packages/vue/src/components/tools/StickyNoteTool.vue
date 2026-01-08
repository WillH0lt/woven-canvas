<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";

function createSnapshot() {
  return JSON.stringify({
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
}

const snapshot = createSnapshot();
</script>

<template>
  <ToolbarButton name="sticky-note" tooltip="Sticky Note" :snapshot="snapshot">
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
