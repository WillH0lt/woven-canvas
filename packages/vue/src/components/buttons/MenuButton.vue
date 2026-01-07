<script setup lang="ts">
import { ref } from "vue";
import { useTooltipSingleton } from "../../composables/useTooltipSingleton";

const props = defineProps<{
  title?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();

function handleClick(event: MouseEvent) {
  emit("click", event);
}

function handleMouseEnter() {
  if (props.title && buttonRef.value) {
    showTooltip(props.title, buttonRef.value);
  }
}

function handleMouseLeave() {
  hideTooltip();
}

defineExpose({ buttonRef });
</script>

<template>
  <button
    ref="buttonRef"
    class="ic-menu-button"
    :disabled="disabled"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </button>
</template>

<style>
.ic-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #374151;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.ic-menu-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.ic-menu-button:active:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.ic-menu-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ic-menu-button svg {
  width: 18px;
  height: 18px;
}
</style>
