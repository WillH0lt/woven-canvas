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
    /** JSON snapshot of the block to create when dragging out from toolbar */
    dragOutSnapshot?: string;
    /** JSON snapshot of the block to create when placing on canvas */
    placementSnapshot?: string;
    /** Cursor kind to use when this tool is active */
    cursor?: string;
  }>(),
  {
    cursor: "crosshair",
  },
);

const injectedContext = inject(TOOLBAR_KEY);
if (!injectedContext) {
  throw new Error("ToolbarButton must be used within a Toolbar component");
}
const toolbarContext = injectedContext;

const buttonRef = ref<HTMLButtonElement | null>(null);
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();

const isSelected = computed(
  () => toolbarContext.activeTool.value === props.name,
);

function handleClick() {
  toolbarContext.setTool(props.name, props.placementSnapshot, props.cursor);
}

function handlePointerDown() {
  toolbarContext.onToolPointerDown(props.name, props.dragOutSnapshot);
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
    class="wov-toolbar-button"
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
.wov-toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--wov-gray-100);
  transition-property: background-color;
  transition-timing-function: var(--wov-transition-timing-function);
  transition-duration: var(--wov-transition-duration);
}

.wov-toolbar-button:hover {
  background-color: var(--wov-gray-600);
}

.wov-toolbar-button.selected {
  background-color: var(--wov-primary);
}

.wov-toolbar-button svg {
  width: 20px;
  height: 20px;
}
</style>
