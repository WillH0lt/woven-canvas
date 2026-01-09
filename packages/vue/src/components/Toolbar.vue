<script setup lang="ts">
import { ref, computed, useSlots, provide, onMounted, watch } from "vue";
import { Controls, Cursor, type Context } from "@infinitecanvas/editor";

import MenuTooltip from "./buttons/MenuTooltip.vue";
import SelectTool from "./tools/SelectTool.vue";
import HandTool from "./tools/HandTool.vue";
import StickyNoteTool from "./tools/StickyNoteTool.vue";
import EraserTool from "./tools/EraserTool.vue";
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

// Built-in tool names
const builtInToolNames = new Set(["select", "hand", "sticky-note", "eraser"]);

// Get custom tool slots
const customTools = computed(() => {
  const tools: string[] = [];
  for (const slotName of Object.keys(slots)) {
    if (slotName.startsWith("tool:")) {
      const toolName = slotName.slice(5);
      if (!builtInToolNames.has(toolName)) {
        tools.push(toolName);
      }
    }
  }
  return tools;
});
</script>

<template>
  <div class="ic-toolbar" @mouseleave="handleMouseLeave">
    <!-- Select tool (built-in with override) -->
    <slot name="tool:select">
      <SelectTool />
    </slot>

    <!-- Hand tool (built-in with override) -->
    <slot name="tool:hand">
      <HandTool />
    </slot>

    <!-- Sticky note tool (built-in with override) -->
    <slot name="tool:sticky-note">
      <StickyNoteTool />
    </slot>

    <!-- Eraser tool (built-in with override) -->
    <slot name="tool:eraser">
      <EraserTool />
    </slot>

    <!-- Custom tools via slots -->
    <template v-for="tool in customTools" :key="tool">
      <slot :name="`tool:${tool}`" />
    </template>

    <!-- Singleton tooltip rendered once for all toolbar items -->
    <MenuTooltip />
  </div>
</template>

<style>
.ic-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  overflow: hidden;
  cursor: pointer;
  color: var(--ic-gray-100);
  background-color: var(--ic-gray-100);
  border-radius: 12px;
  box-shadow: 0px 0px 0.5px rgba(0, 0, 0, 0.18), 0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
}

.ic-toolbar * {
  transition-property: background-color;
  transition-timing-function: var(--ic-transition-timing-function);
  transition-duration: var(--ic-transition-duration);
}

.ic-toolbar *[menu-open] {
  background-color: var(--ic-gray-600);
}

.ic-toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
}

.ic-toolbar-button:hover {
  background-color: var(--ic-gray-200);
}

.ic-toolbar-button.selected {
  background-color: var(--ic-primary);
  color: var(--ic-gray-100);
}

.ic-toolbar-button svg {
  width: 20px;
  height: 20px;
}

.menu {
  background-color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
