<script setup lang="ts">
import ToolbarButton from "../ToolbarButton.vue";

const placementSnapshot = JSON.stringify({
  block: {
    tag: "text",
    size: [200, 32],
  },
  text: {},
});

const dragOutSnapshot = JSON.stringify({
  block: {
    tag: "text",
    size: [200, 32],
  },
  text: {
    content: "text",
  },
});
</script>

<template>
  <ToolbarButton
    name="text"
    tooltip="Text"
    :drag-out-snapshot="dragOutSnapshot"
    :placement-snapshot="placementSnapshot"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-type-icon lucide-type"
    >
      <path d="M12 4v16" />
      <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
      <path d="M9 20h6" />
    </svg>
  </ToolbarButton>
</template>
