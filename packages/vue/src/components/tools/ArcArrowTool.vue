<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";
</script>

<template>
  <ToolbarButton name="arc-arrow" tooltip="Arc Arrow" cursor="crosshair">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Curved arrow path -->
      <path d="M4 14 Q 10 4, 16 14" />
      <!-- Arrow head -->
      <path d="M13 11 L16 14 L12.5 15.5" />
    </svg>
  </ToolbarButton>
</template>
