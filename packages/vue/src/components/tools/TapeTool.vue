<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";

const DEFAULT_TAPE_IMAGE =
  "https://storage.googleapis.com/download/storage/v1/b/zine-maker-public/o/tapes%2F7e3b7dde-927d-4b09-aeb4-d49eac36d4ea.png?generation=1715183194653465&alt=media";

// Snapshot is only used for drag-out from toolbar (not click-to-place).
// Canvas click-to-draw is handled by captureTapeDrawSystem.
const snapshot = JSON.stringify({
  block: {
    tag: "tape",
    size: [200, 30],
  },
  tape: {
    thickness: 30,
  },
  asset: {
    identifier: DEFAULT_TAPE_IMAGE,
    uploadState: "complete",
  },
});
</script>

<template>
  <ToolbarButton
    name="tape"
    tooltip="Tape"
    :drag-out-snapshot="snapshot"
  >
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <!-- Tape ribbon -->
      <rect x="1" y="7" width="18" height="6" rx="1" fill="none" stroke="currentColor" />
      <!-- Diagonal stripe pattern -->
      <line x1="5" y1="7" x2="3" y2="13" opacity="0.4" />
      <line x1="9" y1="7" x2="7" y2="13" opacity="0.4" />
      <line x1="13" y1="7" x2="11" y2="13" opacity="0.4" />
      <line x1="17" y1="7" x2="15" y2="13" opacity="0.4" />
    </svg>
  </ToolbarButton>
</template>
