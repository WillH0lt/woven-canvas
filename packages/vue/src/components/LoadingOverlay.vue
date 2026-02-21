<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

defineProps<{
  isLoading: boolean;
}>();

const spinnerChar = ref("|");
const spinnerCycle = ["|", "/", "-", "\\"];
let intervalId: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  intervalId = setInterval(() => {
    const currentIndex = spinnerCycle.indexOf(spinnerChar.value);
    spinnerChar.value = spinnerCycle[(currentIndex + 1) % spinnerCycle.length]!;
  }, 100);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <Transition name="wov-loading-fade">
    <div v-if="isLoading" class="wov-loading-overlay">
      <div class="wov-loading-spinner">{{ spinnerChar }}</div>
    </div>
  </Transition>
</template>

<style>
.wov-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: var(--wov-z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: all;
}

.wov-loading-spinner {
  font-size: 24px;
  font-family: monospace;
  color: var(--wov-gray-100, #f5f5f5);
}

/* Fade transition */
.wov-loading-fade-enter-active,
.wov-loading-fade-leave-active {
  transition: opacity 0.3s ease;
}

.wov-loading-fade-enter-from,
.wov-loading-fade-leave-to {
  opacity: 0;
}
</style>
