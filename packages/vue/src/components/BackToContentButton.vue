<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import {
  Camera,
  Block,
  Aabb,
  Screen,
  Synced,
  defineQuery,
  type Context,
} from "@woven-canvas/core";
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
 * Frame camera to show all synced blocks.
 * Computes the bounding box of all blocks and centers the camera on it.
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

    // Calculate target zoom to fit all blocks with padding
    let targetZoom = Math.min(
      screen.width / (maxX - minX),
      screen.height / (maxY - minY),
    );
    targetZoom /= 1.1; // Add padding
    targetZoom = Math.min(targetZoom, cam.zoom); // Don't zoom in, only out

    // Calculate target position to center the content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const targetLeft = centerX - screen.width / targetZoom / 2;
    const targetTop = centerY - screen.height / targetZoom / 2;

    // Update camera
    const writableCamera = Camera.write(ctx);
    writableCamera.left = targetLeft;
    writableCamera.top = targetTop;
    writableCamera.zoom = targetZoom;
  });
}
</script>

<template>
  <button v-if="visible" class="ic-back-to-content" @click="handleClick">
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
.ic-back-to-content {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: var(--ic-z-ui);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ic-gray-700, #374151);
  background-color: var(--ic-gray-100, #ffffff);
  border: 1px solid var(--ic-gray-300, #d1d5db);
  border-radius: 8px;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.1);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.ic-back-to-content:hover {
  background-color: var(--ic-gray-200, #f3f4f6);
  border-color: var(--ic-gray-400, #9ca3af);
}

.ic-back-to-content:active {
  background-color: var(--ic-gray-300, #e5e7eb);
}

.ic-back-to-content svg {
  flex-shrink: 0;
}
</style>
