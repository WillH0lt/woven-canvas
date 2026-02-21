<script setup lang="ts">
/**
 * Default TransformBox component - the bounding box around selected items.
 * Shows a border around the selection, handles are rendered separately.
 *
 * Uses CSS variables:
 * --wov-primary: Primary color for the border
 */
</script>

<template>
  <div class="wov-transform-box" />
</template>

<style>
.wov-transform-box {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: calc(2px / var(--wov-zoom)) solid var(--wov-primary);
  pointer-events: none;
}
</style>
