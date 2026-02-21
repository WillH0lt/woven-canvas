<script setup lang="ts">
/**
 * Default SelectionBox component - the marquee selection rectangle.
 * Rendered while dragging on empty canvas space to select multiple blocks.
 *
 * Uses CSS variables:
 * --wov-zoom: Current zoom level (for scaling border width)
 * --wov-primary: Primary color for the border
 */
</script>

<template>
  <div class="wov-selection-box" />
</template>

<style>
.wov-selection-box {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background-color: var(--wov-selection-box-bg);
  border-style: solid;
  border-width: calc(3px / var(--wov-zoom));
  border-color: var(--wov-primary);
}
</style>
