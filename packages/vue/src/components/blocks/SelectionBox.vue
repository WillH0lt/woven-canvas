<script setup lang="ts">
/**
 * Default SelectionBox component - the marquee selection rectangle.
 * Rendered while dragging on empty canvas space to select multiple blocks.
 *
 * Uses CSS variables:
 * --ic-zoom: Current zoom level (for scaling border width)
 * --ic-primary: Primary color for the border
 */
</script>

<template>
  <div class="ic-selection-box" />
</template>

<style>
.ic-selection-box {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background-color: var(--ic-selection-box-bg);
  border-style: solid;
  border-width: 3px;
  border-color: var(--ic-primary);
}
</style>
