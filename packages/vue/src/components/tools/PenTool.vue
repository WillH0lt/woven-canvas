<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";
</script>

<template>
  <ToolbarButton name="pen" tooltip="Pen">
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path
        d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-8.793 8.793-3.536.707.707-3.536 8.794-8.792Z"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M12 5l3 3" stroke-linecap="round" />
    </svg>
  </ToolbarButton>
</template>
