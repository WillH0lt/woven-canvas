<script setup lang="ts">
import { ref } from "vue";
import { useTooltipSingleton } from "../../composables/useTooltipSingleton";

const props = defineProps<{
  title?: string;
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
</script>

<template>
  <button
    ref="buttonRef"
    class="wov-menu-button"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </button>
</template>

<style>
.wov-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--wov-gray-100);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.wov-menu-button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.wov-active {
  background: var(--wov-primary);
}

.wov-menu-button svg {
  width: 22px;
  height: 18px;
  flex-shrink: 0;
}
</style>
