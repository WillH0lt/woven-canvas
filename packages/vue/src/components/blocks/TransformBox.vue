<script setup lang="ts">
/**
 * Default TransformBox component - the bounding box around selected items.
 * Shows a border around the selection, handles are rendered separately.
 *
 * Uses CSS variables:
 * --ic-primary: Primary color for the border
 */
</script>

<template>
  <div class="ic-transform-box" />
</template>

<style>
.ic-transform-box {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid var(--ic-primary);
  pointer-events: none;
}
</style>
