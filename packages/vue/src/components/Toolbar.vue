<script setup lang="ts">
import { ref, computed, useSlots, provide, watch, watchEffect, inject, onMounted, nextTick, type Ref } from "vue";
import { Controls, Cursor, type Context } from "@woven-canvas/core";
import { useElementSize } from "@vueuse/core";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/vue";

import ActionBar from "./ActionBar.vue";
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

// Default tool components (defined once, used in both toolbar and overflow menu)
const defaultTools = [
  SelectTool,
  HandTool,
  TextTool,
  ImageTool,
  ShapeTool,
  ElbowArrowTool,
  StickyNoteTool,
  PenTool,
  EraserTool,
];

// Get container ref from WovenCanvas for teleport
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");

// Responsive toolbar state
const overflowMenuRef = ref<HTMLElement | null>(null);
const overflowMenuOpen = ref(false);

// Refs for measuring actual tool widths
const toolsContainerRef = ref<HTMLElement | null>(null);
const overflowBtnRef = ref<HTMLElement | null>(null);

// Track which tools are visible (by index cutoff)
// Start with a large number so all tools render initially for measurement
const visibleCount = ref(Infinity);
const totalToolCount = ref(0);

// Cache measured tool widths (populated on first mount when all tools visible)
const cachedToolWidths = ref<number[]>([]);
const cachedGap = ref(8);
const cachedOverflowBtnWidth = ref(48); // 40px button + 8px gap

// Use VueUse to observe container size changes
const { width: canvasWidth } = useElementSize(containerRef);

// Get tool elements (direct children excluding overflow button and tooltip)
function getToolElements(): HTMLElement[] {
  if (!toolsContainerRef.value) return [];

  return Array.from(toolsContainerRef.value.children).filter(el => {
    // Exclude overflow button and MenuTooltip
    return !el.classList.contains('wov-overflow-button') &&
           !el.classList.contains('wov-menu-tooltip');
  }) as HTMLElement[];
}

// Measure all tool widths (called once on mount when all tools are visible)
function measureToolWidths() {
  const toolElements = getToolElements();
  if (toolElements.length === 0) return;

  // Store total tool count from DOM
  totalToolCount.value = toolElements.length;

  // Cache gap from container style
  const containerStyle = getComputedStyle(toolsContainerRef.value!);
  cachedGap.value = parseFloat(containerStyle.gap) || 8;

  // Cache overflow button width (button + gap)
  const btnWidth = overflowBtnRef.value?.offsetWidth || 40;
  cachedOverflowBtnWidth.value = btnWidth + cachedGap.value;

  // Measure and cache each tool's width
  cachedToolWidths.value = toolElements.map(el => el.offsetWidth);
}

// Calculate visible tools based on cached widths and available space
function recalculateVisibleTools() {
  if (cachedToolWidths.value.length === 0) return;

  // Use canvas container width minus safe margins and toolbar padding
  const safeMargin = 40;
  const toolbarPadding = 20; // 10px on each side
  const availableWidth = canvasWidth.value - safeMargin - toolbarPadding;

  const gap = cachedGap.value;
  const overflowBtnWidth = cachedOverflowBtnWidth.value;

  let totalWidth = 0;
  let fitCount = 0;

  for (let i = 0; i < cachedToolWidths.value.length; i++) {
    const toolWidth = cachedToolWidths.value[i];
    const widthWithGap = totalWidth > 0 ? toolWidth + gap : toolWidth;

    // Check if adding this tool (plus overflow button if needed) exceeds available space
    const remainingTools = cachedToolWidths.value.length - i - 1;
    const needsOverflow = remainingTools > 0;
    const requiredSpace = needsOverflow ? overflowBtnWidth : 0;

    if (totalWidth + widthWithGap + requiredSpace <= availableWidth) {
      totalWidth += widthWithGap;
      fitCount++;
    } else {
      break;
    }
  }

  // Ensure at least 1 tool is visible
  visibleCount.value = Math.max(1, fitCount);
}

// Watch for container size changes (after initial measurement)
watch(canvasWidth, () => {
  if (cachedToolWidths.value.length > 0) {
    recalculateVisibleTools();
  }
});

// Initial measurement and calculation after mount
onMounted(() => {
  nextTick(() => {
    measureToolWidths();
    recalculateVisibleTools();
  });
});

const hasOverflow = computed(() => visibleCount.value < totalToolCount.value);

// Update DOM visibility of tools based on visibleCount
watchEffect(() => {
  const toolElements = getToolElements();
  toolElements.forEach((el, index) => {
    el.style.display = index < visibleCount.value ? '' : 'none';
  });
});

// Update overflow menu visibility
watchEffect(() => {
  if (!overflowMenuRef.value) return;

  const overflowTools = Array.from(overflowMenuRef.value.children) as HTMLElement[];
  overflowTools.forEach((el, index) => {
    el.style.display = index >= visibleCount.value ? '' : 'none';
  });
});

// Floating UI for overflow menu
const { floatingStyles } = useFloating(overflowBtnRef, overflowMenuRef, {
  placement: 'top',
  middleware: [offset(16), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
});

// Overflow menu handlers
function toggleOverflowMenu() {
  overflowMenuOpen.value = !overflowMenuOpen.value;
}

function closeOverflowMenu() {
  overflowMenuOpen.value = false;
}

function handleOverflowClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (
    overflowBtnRef.value &&
    !overflowBtnRef.value.contains(target) &&
    overflowMenuRef.value &&
    !overflowMenuRef.value.contains(target)
  ) {
    closeOverflowMenu();
  }
}

// Watch overflow menu state for click outside handling
watch(overflowMenuOpen, (open) => {
  if (open) {
    document.addEventListener("click", handleOverflowClickOutside, true);
  } else {
    document.removeEventListener("click", handleOverflowClickOutside, true);
  }
});

// Close overflow menu when tools change (e.g., window resize)
watch(hasOverflow, (has) => {
  if (!has) {
    closeOverflowMenu();
  }
});

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
    <ActionBar />

    <div ref="toolsContainerRef" class="wov-toolbar" @mouseleave="handleMouseLeave">
      <!-- Render slot content or default tools -->
      <template v-if="slots.default">
        <slot />
      </template>
      <template v-else>
        <component v-for="(Tool, i) in defaultTools" :key="i" :is="Tool" />
      </template>

      <!-- Overflow button -->
      <button
        v-if="hasOverflow"
        ref="overflowBtnRef"
        class="wov-toolbar-button wov-overflow-button"
        :class="{ 'menu-open': overflowMenuOpen }"
        @click="toggleOverflowMenu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <!-- Singleton tooltip rendered once for all toolbar items -->
      <MenuTooltip />
    </div>

    <!-- Overflow menu -->
    <Teleport v-if="containerRef" :to="containerRef">
      <div
        v-if="overflowMenuOpen && hasOverflow"
        ref="overflowMenuRef"
        class="wov-toolbar-overflow-menu"
        :style="floatingStyles"
      >
        <!-- Render same content as toolbar for overflow -->
        <template v-if="slots.default">
          <slot />
        </template>
        <template v-else>
          <component v-for="(Tool, i) in defaultTools" :key="i" :is="Tool" />
        </template>
      </div>
    </Teleport>
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

.wov-overflow-button.menu-open {
  background-color: var(--wov-gray-300);
}

.wov-toolbar-overflow-menu {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  background-color: var(--wov-gray-100);
  border-radius: 12px;
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  z-index: var(--wov-z-dropdown);
}

.menu {
  background-color: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
