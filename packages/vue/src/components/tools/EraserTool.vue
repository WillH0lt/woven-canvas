<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";
</script>

<template>
  <ToolbarButton name="eraser" tooltip="Eraser">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <!-- Eraser icon: rectangle with angled top -->
      <path d="M4 14l8-8 4 4-8 8H4v-4z" />
      <path d="M10 8l4 4" />
    </svg>
  </ToolbarButton>
</template>
