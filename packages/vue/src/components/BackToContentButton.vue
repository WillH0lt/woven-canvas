<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import {
  Camera,
  Block,
  Aabb,
  Screen,
  Synced,
  defineQuery,
  getPluginResources,
  type Context,
} from "@woven-canvas/core";
import {
  CONTROLS_PLUGIN_NAME,
  DEFAULT_CONTROLS_OPTIONS,
  type CanvasControlsOptions,
} from "@woven-canvas/plugin-canvas-controls";
import { useEditorContext } from "../composables/useEditorContext";
import { useSingleton } from "../composables/useSingleton";

const { nextEditorTick } = useEditorContext();
const camera = useSingleton(Camera);

// Query for synced blocks with Aabb (persistent blocks)
const syncedBlocksQuery = defineQuery((q) => q.with(Synced, Block, Aabb));

// Track synced block count
const syncedBlockCount = ref(0);

// Register tick callback to update synced block count
import { inject } from "vue";
import { WOVEN_CANVAS_KEY } from "../injection";

const canvasContext = inject(WOVEN_CANVAS_KEY);

if (canvasContext) {
  const unregister = canvasContext.registerTickCallback((ctx: Context) => {
    if (syncedBlocksQuery.addedOrRemoved(ctx).length > 0) {
      syncedBlockCount.value = syncedBlocksQuery.current(ctx).length;
    }
  });
  onUnmounted(unregister);
}

// Whether to show the button
const visible = ref(false);

// Update visibility when camera or block count changes
import { watchEffect } from "vue";
watchEffect(() => {
  visible.value = !camera.value.canSeeBlocks && syncedBlockCount.value > 0;
});

/**
 * Check if an AABB intersects with the camera viewport.
 */
function aabbIntersectsViewport(
  aabb: readonly [number, number, number, number],
  left: number,
  top: number,
  width: number,
  height: number,
): boolean {
  const right = left + width;
  const bottom = top + height;
  return aabb[0] < right && aabb[2] > left && aabb[1] < bottom && aabb[3] > top;
}

/**
 * Frame camera to show all synced blocks.
 * Computes the bounding box of all blocks and centers the camera on it.
 * If no block is visible at the resulting position (due to zoom limits),
 * centers on a random block instead.
 */
function handleClick() {
  // TODO: Emit backToContent command when implemented
  // For now, directly update camera position

  nextEditorTick((ctx) => {
    const blockIds = syncedBlocksQuery.current(ctx);
    if (blockIds.length === 0) return;

    // Compute bounding box of all synced blocks
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const entityId of blockIds) {
      const aabb = Aabb.read(ctx, entityId);
      minX = Math.min(minX, aabb.value[0]); // left
      minY = Math.min(minY, aabb.value[1]); // top
      maxX = Math.max(maxX, aabb.value[2]); // right
      maxY = Math.max(maxY, aabb.value[3]); // bottom
    }

    const screen = Screen.read(ctx);
    const cam = Camera.read(ctx);

    // Get zoom bounds from controls plugin (or use defaults)
    const controlsOptions =
      getPluginResources<CanvasControlsOptions>(ctx, CONTROLS_PLUGIN_NAME) ??
      DEFAULT_CONTROLS_OPTIONS;

    // Calculate target zoom to fit all blocks with padding
    let targetZoom = Math.min(
      screen.width / (maxX - minX),
      screen.height / (maxY - minY),
    );
    targetZoom /= 1.1; // Add padding
    targetZoom = Math.min(targetZoom, cam.zoom); // Don't zoom in, only out
    // Clamp to zoom bounds
    targetZoom = Math.max(
      controlsOptions.minZoom,
      Math.min(controlsOptions.maxZoom, targetZoom),
    );

    // Calculate target position to center the content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    let targetLeft = centerX - screen.width / targetZoom / 2;
    let targetTop = centerY - screen.height / targetZoom / 2;

    // Calculate viewport dimensions at target zoom
    const viewportWidth = screen.width / targetZoom;
    const viewportHeight = screen.height / targetZoom;

    // Check if any block is visible in the target viewport
    let anyBlockVisible = false;
    for (const entityId of blockIds) {
      const aabb = Aabb.read(ctx, entityId);
      if (
        aabbIntersectsViewport(
          aabb.value,
          targetLeft,
          targetTop,
          viewportWidth,
          viewportHeight,
        )
      ) {
        anyBlockVisible = true;
        break;
      }
    }

    // If no block is visible, pick a random block and center on it
    if (!anyBlockVisible) {
      const randomIndex = Math.floor(Math.random() * blockIds.length);
      const randomBlockId = blockIds[randomIndex];
      const aabb = Aabb.read(ctx, randomBlockId);
      const blockCenterX = (aabb.value[0] + aabb.value[2]) / 2;
      const blockCenterY = (aabb.value[1] + aabb.value[3]) / 2;
      targetLeft = blockCenterX - viewportWidth / 2;
      targetTop = blockCenterY - viewportHeight / 2;
    }

    // Update camera
    const writableCamera = Camera.write(ctx);
    writableCamera.left = targetLeft;
    writableCamera.top = targetTop;
    writableCamera.zoom = targetZoom;
  });
}
</script>

<template>
  <button v-if="visible" class="wov-back-to-content" @click="handleClick">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 12L6 8L10 4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    Back to content
  </button>
</template>

<style>
.wov-back-to-content {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: var(--wov-z-ui);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--wov-gray-700, #374151);
  background-color: var(--wov-gray-100, #ffffff);
  border: 1px solid var(--wov-gray-300, #d1d5db);
  border-radius: 8px;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.1);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.wov-back-to-content:hover {
  background-color: var(--wov-gray-200, #f3f4f6);
  border-color: var(--wov-gray-400, #9ca3af);
}

.wov-back-to-content:active {
  background-color: var(--wov-gray-300, #e5e7eb);
}

.wov-back-to-content svg {
  flex-shrink: 0;
}
</style>
