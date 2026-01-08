<script setup lang="ts">
import { computed, ref, inject, provide } from "vue";
import { useFloating, offset, flip, shift } from "@floating-ui/vue";
import {
  Block,
  Camera,
  Screen,
  Opacity,
  getResources,
  type EntityId,
  type EditorResources,
} from "@infinitecanvas/editor";
import { TransformBox, Selected } from "@infinitecanvas/plugin-selection";
import { Aabb, Rect } from "@infinitecanvas/math";
import { useQuery } from "../composables/useQuery";
import { useSingleton } from "../composables/useSingleton";
import { INFINITE_CANVAS_KEY, FLOATING_MENU_KEY } from "../injection";
import { computeCommonComponents } from "../utils/computeCommonComponents";
import FloatingMenuBar from "./FloatingMenuBar.vue";

// Get editor from context
const canvasContext = inject(INFINITE_CANVAS_KEY);

// Query all selected blocks
const selectedItems = useQuery([Block, Selected] as const);

// Query transform box with opacity (hidden when opacity exists and is 0)
const transformBoxWithOpacity = useQuery([TransformBox, Opacity] as const);

// Get camera and screen for coordinate transforms
const camera = useSingleton(Camera);
const screen = useSingleton(Screen);

// Get userId from editor
const userId = computed(() => {
  const editor = canvasContext?.getEditor();
  if (!editor) return "";

  const { sessionId } = getResources<EditorResources>(editor._getContext());
  return sessionId;
});

// Filter to only blocks selected by current user
const mySelectedItems = computed(() => {
  const uid = userId.value;
  if (!uid) return [];

  return selectedItems.value.filter(
    (item) => item.selected.value?.selectedBy === uid
  );
});

// Selected entity IDs
const selectedIds = computed<EntityId[]>(() =>
  mySelectedItems.value.map((item) => item.entityId)
);

// Compute common components across selection
const commonComponents = computed(() => {
  const editor = canvasContext?.getEditor();
  if (!editor || mySelectedItems.value.length === 0) return new Set<string>();

  const blocks = mySelectedItems.value.map((item) => ({
    tag: item.block.value.tag,
  }));
  return computeCommonComponents(editor, blocks);
});

// Provide context for child components
provide(FLOATING_MENU_KEY, { selectedIds, commonComponents });

// Pre-allocated array for calculations
const _aabb: Aabb = [0, 0, 0, 0];

// Compute selection bounds in screen coordinates (accounting for rotation)
const selectionBounds = computed<Aabb | null>(() => {
  if (mySelectedItems.value.length === 0) return null;

  const cam = camera.value;
  if (!cam) return null;

  let bounds: Aabb | null = null;

  for (const item of mySelectedItems.value) {
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

// Container element ref (passed from InfiniteCanvas)
const containerRef = inject<{ value: HTMLElement | null }>("containerRef");

// Virtual reference element for floating-ui
// Represents the selection bounding box in screen coordinates
const virtualReference = computed(() => {
  const bounds = selectionBounds.value;
  const container = containerRef?.value;
  if (!bounds || !container) return null;

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

// Use floating-ui for positioning
const { floatingStyles } = useFloating(virtualReference, floatingRef, {
  placement: "top",
  middleware: [
    offset(12), // Gap between selection and menu
    flip({
      fallbackPlacements: ["bottom"],
    }),
    shift({ padding: 8 }), // Keep menu within viewport
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

// Check if transform box is hidden (has opacity 0)
const isTransformBoxHidden = computed(() => {
  for (const item of transformBoxWithOpacity.value) {
    if (item.opacity.value.value === 0) {
      return true;
    }
  }
  return false;
});

// Should the menu be visible?
const shouldShow = computed(
  () => mySelectedItems.value.length > 0 && !isOffScreen.value && !isTransformBoxHidden.value
);
</script>

<template>
  <Transition name="ic-fade">
    <div
      v-if="shouldShow"
      ref="floatingRef"
      class="ic-floating-menu"
      :style="floatingStyles"
    >
      <div class="ic-floating-menu-inner">
        <slot>
          <FloatingMenuBar />
        </slot>
      </div>
    </div>
  </Transition>
</template>

<style>
.ic-floating-menu {
  position: absolute;
  z-index: 10000;
  pointer-events: auto;
}

.ic-floating-menu-inner {
  transition: transform 0.15s ease-out;
}

.ic-fade-enter-active {
  transition: opacity 0.15s ease-out;
}

.ic-fade-enter-from {
  opacity: 0;
}

.ic-fade-enter-from .ic-floating-menu-inner {
  transform: translateY(10px);
}
</style>
