<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";
</script>

<template>
  <ToolbarButton name="elbow-arrow" tooltip="Elbow Arrow" cursor="crosshair">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Elbow arrow path (orthogonal) -->
      <path d="M4 6 L10 6 L10 14 L16 14" />
      <!-- Arrow head -->
      <path d="M13 11 L16 14 L13 17" />
    </svg>
  </ToolbarButton>
</template>
