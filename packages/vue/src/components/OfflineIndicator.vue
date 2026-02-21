<script setup lang="ts">
defineProps<{
  isOnline: boolean;
}>();
</script>

<template>
  <div v-if="!isOnline" class="wov-offline-indicator">Working Offline</div>
</template>

<style>
.wov-offline-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: var(--wov-z-ui);
  padding: 6px 12px;
  color: var(--wov-gray-400);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
}
</style>
