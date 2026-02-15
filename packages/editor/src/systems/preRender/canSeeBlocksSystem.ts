import {
  defineQuery,
  hasComponent,
  type Context,
  type EntityId,
} from "@woven-ecs/core";
import { Aabb as AabbMath } from "@infinitecanvas/math";
import { Synced } from "@woven-ecs/canvas-store";

import { defineEditorSystem } from "../../EditorSystem";
import { Camera } from "../../singletons";
import { Block, Aabb } from "../../components";

const camerasQuery = defineQuery((q) => q.tracking(Camera));

// Query for synced blocks with Aabb (persistent blocks)
const blocksQuery = defineQuery((q) => q.with(Synced, Block, Aabb));

const syncedBlocksQuery = defineQuery((q) => q.with(Synced, Block));

// Re-usable AABB for camera viewport (avoids allocation)
const _cameraAabb: AabbMath = [0, 0, 0, 0];

/**
 * PreRender system - updates Camera.canSeeBlocks based on whether any blocks
 * are visible in the current viewport.
 *
 * This is used to show a "back to content" button when the user has panned
 * away from all content.
 *
 * Runs early in the render phase (priority: 90) after scaleWithZoom but before
 * other render systems.
 */
export const canSeeBlocksSystem = defineEditorSystem(
  { phase: "render", priority: 90 },
  (ctx: Context) => {
    if (
      camerasQuery.changed(ctx).length === 0 &&
      syncedBlocksQuery.removed(ctx).length === 0
    ) {
      // No camera changes, skip expensive block intersection checks
      return;
    }

    const camera = Camera.read(ctx);

    const cameraAabb = Camera.getAabb(ctx, _cameraAabb);

    // Optimization: if we could see blocks before, check if we can still see the same block
    if (camera.canSeeBlocks && camera.lastSeenBlock !== null) {
      // Check if entity still exists with Aabb component before reading
      if (hasComponent(ctx, camera.lastSeenBlock, Aabb)) {
        const aabb = Aabb.read(ctx, camera.lastSeenBlock);
        if (AabbMath.intersects(cameraAabb, aabb.value)) {
          // Still visible, no need to update
          return;
        }
      }
    }

    // Check if any block intersects with the camera viewport
    let seenBlock: EntityId | null = null;
    for (const entityId of blocksQuery.current(ctx)) {
      const aabb = Aabb.read(ctx, entityId);
      if (AabbMath.intersects(cameraAabb, aabb.value)) {
        seenBlock = entityId;
        break;
      }
    }

    const canSeeBlocks = seenBlock !== null;

    // Early exit if state hasn't changed
    if (canSeeBlocks === camera.canSeeBlocks) {
      if (seenBlock !== camera.lastSeenBlock) {
        Camera.write(ctx).lastSeenBlock = seenBlock;
      }
      return;
    }

    // Update camera state
    const writableCamera = Camera.write(ctx);
    writableCamera.canSeeBlocks = canSeeBlocks;
    writableCamera.lastSeenBlock = seenBlock;
  },
);
