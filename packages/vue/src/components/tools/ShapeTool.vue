<script setup lang="ts">
import { VerticalAlignment, TextAlignment } from "@woven-canvas/core";
import { StrokeKind } from "../../Shape";
import ToolbarButton from "../ToolbarButton.vue";

const snapshot = JSON.stringify({
  block: {
    tag: "shape",
    size: [200, 200],
  },
  shape: {
    kind: "rectangle",
    strokeKind: StrokeKind.Solid,
    strokeWidth: 2,
    strokeRed: 0,
    strokeGreen: 0,
    strokeBlue: 0,
    strokeAlpha: 255,
    fillRed: 255,
    fillGreen: 255,
    fillBlue: 255,
    fillAlpha: 0,
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
