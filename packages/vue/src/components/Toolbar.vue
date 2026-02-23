<script setup lang="ts">
import { ref, computed, useSlots, provide } from "vue";
import { Controls, Cursor, type Context } from "@woven-canvas/core";

import MenuTooltip from "./buttons/MenuTooltip.vue";
import SelectTool from "./tools/SelectTool.vue";
import HandTool from "./tools/HandTool.vue";
import StickyNoteTool from "./tools/StickyNoteTool.vue";
import ShapeTool from "./tools/ShapeTool.vue";
import EraserTool from "./tools/EraserTool.vue";
import PenTool from "./tools/PenTool.vue";
import TextTool from "./tools/TextTool.vue";
import ElbowArrowTool from "./tools/ElbowArrowTool.vue";
import ImageTool from "./tools/ImageTool.vue";
import { useTooltipSingleton } from "../composables/useTooltipSingleton";
import { TOOLBAR_KEY, type ToolbarContext } from "../injection";
import { useSingleton } from "../composables/useSingleton";
import { useEditorContext } from "../composables/useEditorContext";

const slots = useSlots();
const { reset: resetTooltip } = useTooltipSingleton();
const { nextEditorTick } = useEditorContext();

const heldTool = ref<string | null>(null);
const heldSnapshot = ref<string | null>(null);

const controls = useSingleton(Controls);

const activeTool = computed(() => controls.value.leftMouseTool);

// Set the active tool via the editor
function setTool(toolName: string, snapshot?: string, cursor?: string) {
  // Store snapshot locally for drag-out detection
  heldSnapshot.value = snapshot ?? null;

  nextEditorTick((ctx: Context) => {
    const controls = Controls.write(ctx);
    controls.leftMouseTool = toolName;
    controls.heldSnapshot = snapshot ?? "";

    if (cursor) {
      Cursor.setCursor(ctx, cursor);
    }
  });
}

// Handle drag-out: set drag-out tool so blockPlacementSystem handles it
function dragOutTool(snapshot: string) {
  nextEditorTick((ctx: Context) => {
    const controls = Controls.write(ctx);
    controls.leftMouseTool = "drag-out";
    controls.heldSnapshot = snapshot;
  });
}

// Track pointer state for drag-out detection
function onToolPointerDown(toolName: string, snapshot?: string) {
  heldTool.value = toolName;
  heldSnapshot.value = snapshot ?? null;
}

function onToolPointerUp() {
  heldTool.value = null;
  heldSnapshot.value = null;
}

// Handle mouse leave from toolbar - trigger drag-out if holding a tool
function handleMouseLeave() {
  resetTooltip();

  if (heldTool.value && heldSnapshot.value) {
    dragOutTool(heldSnapshot.value);
  }

  heldTool.value = null;
  heldSnapshot.value = null;
}

// Provide context to child tool components
const toolbarContext: ToolbarContext = {
  activeTool,
  heldTool,
  setTool,
  dragOutTool,
  onToolPointerDown,
  onToolPointerUp,
};
provide(TOOLBAR_KEY, toolbarContext);

</script>

<template>
  <div class="wov-toolbar-container">
    <div class="wov-toolbar" @mouseleave="handleMouseLeave">
      <!-- If default slot has content, render only that -->
      <template v-if="slots.default">
        <slot />
      </template>

      <!-- Otherwise render the default toolbar -->
      <template v-else>
        <SelectTool />
        <HandTool />
        <TextTool />
        <ImageTool />
        <ShapeTool />
        <ElbowArrowTool />
        <StickyNoteTool />
        <PenTool />
        <EraserTool />
      </template>

      <!-- Singleton tooltip rendered once for all toolbar items -->
      <MenuTooltip />
    </div>
  </div>
</template>

<style>
.wov-toolbar-container {
  position: absolute;
  bottom: calc(var(--wov-toolbar-bottom-offset, 20px) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--wov-z-ui);
}

.wov-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  overflow: hidden;
  cursor: pointer;
  color: var(--wov-gray-100);
  background-color: var(--wov-gray-100);
  border-radius: 12px;
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
}

.wov-toolbar * {
  transition-property: background-color;
  transition-timing-function: var(--wov-transition-timing-function);
  transition-duration: var(--wov-transition-duration);
}

.wov-toolbar *[menu-open] {
  background-color: var(--wov-gray-600);
}

.wov-toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
}

.wov-toolbar-button:hover {
  background-color: var(--wov-gray-200);
}

.wov-toolbar-button.selected {
  background-color: var(--wov-primary);
  color: var(--wov-gray-100);
}

.wov-toolbar-button svg {
  width: 20px;
  height: 20px;
  display: block;
  flex-shrink: 0;
}

.menu {
  background-color: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
