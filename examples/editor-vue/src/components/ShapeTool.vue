<script setup lang="ts">
import { VerticalAlignment, TextAlignment } from "@infinitecanvas/editor";
import { ToolbarButton } from "@infinitecanvas/vue";

// Create a snapshot for a shape block that can be placed or dragged
const snapshot = JSON.stringify({
  block: {
    tag: "shape",
    size: [200, 150],
  },
  shape: { border: 5 },
  color: {
    red: 74,
    green: 144,
    blue: 217,
  },
  text: {
    defaultAlignment: TextAlignment.Center,
  },
  verticalAlign: {
    value: VerticalAlignment.Center,
  },
});
</script>

<template>
  <ToolbarButton
    name="shape"
    tooltip="Shape"
    :drag-out-snapshot="snapshot"
    :placement-snapshot="snapshot"
  >
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <rect x="3" y="3" width="14" height="14" rx="2" />
    </svg>
  </ToolbarButton>
</template>
