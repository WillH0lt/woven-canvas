<script setup lang="ts">
defineProps<{
  selected?: boolean;
  hovered?: boolean;
  color?: string;
}>();
</script>

<template>
  <div
    class="rect-block"
    :style="{
      backgroundColor: color ?? '#4a90d9',
      border: selected
        ? '2px solid #3f1773'
        : hovered
          ? '2px solid #69449b'
          : 'none',
    }"
  />
</template>

<style scoped>
.rect-block {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  box-sizing: border-box;
}
</style>
