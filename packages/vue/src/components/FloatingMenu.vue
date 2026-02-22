<script setup lang="ts">
import { computed, ref, inject, provide } from "vue";
import { useFloating, offset, flip, shift } from "@floating-ui/vue";
import {
  Block,
  Camera,
  Screen,
  type EntityId,
} from "@woven-canvas/core";
import {
  Selected,
  SelectionStateSingleton,
  SelectionState,
} from "@woven-canvas/plugin-selection";
import { Aabb, Rect } from "@woven-canvas/math";

import { useQuery } from "../composables/useQuery";
import { useSingleton } from "../composables/useSingleton";
import { useTextEditorController } from "../composables/useTextEditorController";
import { WOVEN_CANVAS_KEY, FLOATING_MENU_KEY } from "../injection";
import { computeCommonComponents } from "../utils/computeCommonComponents";
import FloatingMenuBar from "./FloatingMenuBar.vue";

// Get editor from context
const canvasContext = inject(WOVEN_CANVAS_KEY);

// Query all selected blocks
const selectedItems = useQuery([Block, Selected]);

// Get camera and screen for coordinate transforms
const camera = useSingleton(Camera);
const screen = useSingleton(Screen);
const selectionState = useSingleton(SelectionStateSingleton);

// Get text editor controller for live editing bounds
const textEditorController = useTextEditorController();

// Selected entity IDs
const selectedIds = computed<EntityId[]>(() =>
  selectedItems.value.map((item) => item.entityId),
);

// Compute common components across selection
const commonComponents = computed(() => {
  const editor = canvasContext?.getEditor();
  if (!editor || selectedItems.value.length === 0) return new Set<string>();

  const blocks = selectedItems.value.map((item) => ({
    tag: item.block.value.tag,
  }));
  return computeCommonComponents(editor, blocks);
});

// Provide context for child components
provide(FLOATING_MENU_KEY, { selectedIds, commonComponents });

// Pre-allocated array for calculations
const _aabb: Aabb = [0, 0, 0, 0];

// Helper to combine multiple element bounds into a union
function getCombinedBounds(...elements: (HTMLElement | null)[]): DOMRect | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let hasValidBounds = false;

  for (const el of elements) {
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) continue;

    hasValidBounds = true;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  if (!hasValidBounds) return null;

  return {
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    toJSON: () => ({}),
  };
}

// Compute selection bounds in screen coordinates (accounting for rotation)
const selectionBounds = computed<Aabb | null>(() => {
  if (selectedItems.value.length === 0) return null;

  const cam = camera.value;
  if (!cam) return null;

  let bounds: Aabb | null = null;

  for (const item of selectedItems.value) {
    const block = item.block.value;
    Rect.getAabb(block.position, block.size, block.rotateZ, _aabb);
    Aabb.translate(_aabb, [-cam.left, -cam.top]);
    Aabb.scale(_aabb, cam.zoom);

    if (bounds === null) {
      bounds = Aabb.clone(_aabb);
    } else {
      Aabb.union(bounds, _aabb);
    }
  }

  return bounds;
});

// Container element ref (passed from WovenCanvas)
const containerRef = inject<{ value: HTMLElement | null }>("containerRef");

// Virtual reference element for floating-ui
// Represents the selection bounding box in screen coordinates
const virtualReference = computed(() => {
  const container = containerRef?.value;
  if (!container) return null;

  // Dependencies for reactivity
  void camera.value;
  void textEditorController.updateCounter.value;

  // Use live element bounds if editing (read directly from DOM)
  // Combine block element (outer bounds) with text element (grows with content)
  const blockElement = textEditorController.blockElement.value;
  const textElement = textEditorController.textElement.value;
  const combinedRect = getCombinedBounds(blockElement, textElement);
  if (combinedRect) {
    return {
      getBoundingClientRect: () => combinedRect,
    };
  }

  // Fall back to ECS-based selection bounds
  const bounds = selectionBounds.value;
  if (!bounds) return null;

  // Get container offset in viewport
  const containerRect = container.getBoundingClientRect();

  return {
    getBoundingClientRect() {
      return {
        x: containerRect.left + bounds[0],
        y: containerRect.top + bounds[1],
        width: bounds[2] - bounds[0],
        height: bounds[3] - bounds[1],
        top: containerRect.top + bounds[1],
        left: containerRect.left + bounds[0],
        right: containerRect.left + bounds[2],
        bottom: containerRect.top + bounds[3],
      };
    },
  };
});

// Floating menu element ref
const floatingRef = ref<HTMLElement | null>(null);

// Custom middleware to clamp menu to viewport when it would go off-screen
const clampToViewport = {
  name: "clampToViewport",
  fn({ y, rects }: { y: number; rects: { floating: { height: number } } }) {
    const padding = 8;
    const viewportHeight = window.innerHeight;
    const maxY = viewportHeight - rects.floating.height - padding;
    return {
      y: Math.max(padding, Math.min(y, maxY)),
    };
  },
};

// Use floating-ui for positioning
const { floatingStyles } = useFloating(virtualReference, floatingRef, {
  placement: "top",
  middleware: [
    offset(12), // Gap between selection and menu
    flip({
      fallbackPlacements: ["bottom"],
    }),
    shift({ padding: 8 }), // Keep menu within viewport horizontally
    clampToViewport, // Clamp to top of screen if it would go above
  ],
});

// Check if selection is entirely off-screen (hide menu)
const isOffScreen = computed(() => {
  const bounds = selectionBounds.value;
  const scr = screen.value;
  if (!bounds || !scr) return true;

  // Selection is off-screen if entirely outside viewport
  return (
    bounds[2] < 0 ||
    bounds[0] > scr.width ||
    bounds[3] < 0 ||
    bounds[1] > scr.height
  );
});

const hiddenSelectionStates: SelectionState[] = [
  SelectionState.Dragging,
  SelectionState.SelectionBoxDragging,
];

// Should the menu be visible?
const shouldShow = computed(
  () =>
    selectedItems.value.length > 0 &&
    !isOffScreen.value &&
    !hiddenSelectionStates.includes(selectionState.value.state),
);
</script>

<template>
  <Transition name="wov-fade">
    <div
      v-if="shouldShow"
      ref="floatingRef"
      class="wov-floating-menu"
      :style="floatingStyles"
    >
      <div class="wov-floating-menu-inner">
        <slot>
          <FloatingMenuBar />
        </slot>
      </div>
    </div>
  </Transition>
</template>

<style>
.wov-floating-menu {
  position: absolute;
  z-index: var(--wov-z-floating-menu);
  pointer-events: auto;
}

.wov-floating-menu-inner {
  transition: transform 0.15s ease-out;
}

.wov-fade-enter-active {
  transition: opacity 0.15s ease-out;
}

.wov-fade-enter-from {
  opacity: 0;
}

.wov-fade-enter-from .wov-floating-menu-inner {
  transform: translateY(10px);
}
</style>
