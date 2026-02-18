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
  <Transition name="ic-loading-fade">
    <div v-if="isLoading" class="ic-loading-overlay">
      <div class="ic-loading-spinner">{{ spinnerChar }}</div>
    </div>
  </Transition>
</template>

<style>
.ic-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: all;
}

.ic-loading-spinner {
  font-size: 24px;
  font-family: monospace;
  color: var(--ic-gray-100, #f5f5f5);
}

/* Fade transition */
.ic-loading-fade-enter-active,
.ic-loading-fade-leave-active {
  transition: opacity 0.3s ease;
}

.ic-loading-fade-enter-from,
.ic-loading-fade-leave-to {
  opacity: 0;
}
</style>
