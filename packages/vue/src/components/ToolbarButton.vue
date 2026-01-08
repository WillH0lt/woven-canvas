<script setup lang="ts">
import { ref, computed, inject } from "vue";
import { useTooltipSingleton } from "../composables/useTooltipSingleton";
import { TOOLBAR_KEY } from "../injection";

const props = withDefaults(
  defineProps<{
    /** Unique name for this tool */
    name: string;
    /** Tooltip text shown on hover */
    tooltip?: string;
    /** JSON snapshot of the block to create when this tool is used */
    snapshot?: string;
    /** Cursor kind to use when this tool is active */
    cursor?: string;
  }>(),
  {
    cursor: "crosshair",
  }
);

const injectedContext = inject(TOOLBAR_KEY);
if (!injectedContext) {
  throw new Error("ToolbarButton must be used within a Toolbar component");
}
const toolbarContext = injectedContext;

const buttonRef = ref<HTMLButtonElement | null>(null);
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();

const isSelected = computed(
  () => toolbarContext.activeTool.value === props.name
);

function handleClick() {
  toolbarContext.setTool(props.name, props.snapshot, props.cursor);
}

function handlePointerDown() {
  toolbarContext.onToolPointerDown(props.name, props.snapshot);
}

function handlePointerUp() {
  toolbarContext.onToolPointerUp();
}

function handleMouseEnter() {
  if (props.tooltip && buttonRef.value) {
    showTooltip(props.tooltip, buttonRef.value);
  }
}

function handleMouseLeave() {
  hideTooltip();
}
</script>

<template>
  <button
    ref="buttonRef"
    class="ic-toolbar-button"
    :class="{ selected: isSelected }"
    @click="handleClick"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </button>
</template>

<style>
.ic-toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ic-gray-100);
  transition-property: background-color;
  transition-timing-function: var(--ic-transition-timing-function);
  transition-duration: var(--ic-transition-duration);
}

.ic-toolbar-button:hover {
  background-color: var(--ic-gray-600);
}

.ic-toolbar-button.selected {
  background-color: var(--ic-primary);
}

.ic-toolbar-button svg {
  width: 20px;
  height: 20px;
}
</style>
