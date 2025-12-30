import {
  defineSystem,
  defineQuery,
  type Context,
  type EntityId,
} from "@infinitecanvas/ecs";
import { Camera } from "../../singletons";
import { Vec2, Scalar } from "@infinitecanvas/math";

import { Block, ScaleWithZoom } from "../../components";
import { ScaleWithZoomState } from "../../singletons";

// Query for entities with ScaleWithZoom
const scaleWithZoomQuery = defineQuery((q) =>
  q.with(Block).tracking(ScaleWithZoom)
);

// Pre-allocated vectors to avoid allocations in hot path
const _scaledSize: Vec2 = [0, 0];
const _anchorOffset: Vec2 = [0, 0];

/**
 * PreRenderScaleWithZoom system - maintains screen-space size for entities
 * with the ScaleWithZoom component.
 *
 * When the camera zoom changes, this system scales entities inversely so they
 * appear the same size on screen regardless of zoom level. This is used for
 * transform handles, UI elements, etc.
 *
 * The scaling pivots around the anchor point specified in the ScaleWithZoom
 * component (default center [0.5, 0.5]).
 */
export const scaleWithZoomSystem = defineSystem((ctx: Context) => {
  const camera = Camera.read(ctx);
  const state = ScaleWithZoomState.read(ctx);

  // Check if zoom changed
  const zoomChanged = !Scalar.approxEqual(camera.zoom, state.lastZoom);

  if (zoomChanged) {
    // Zoom changed - update all ScaleWithZoom entities
    for (const entityId of scaleWithZoomQuery.current(ctx)) {
      scaleBlock(ctx, entityId, camera.zoom);
    }
    ScaleWithZoomState.write(ctx).lastZoom = camera.zoom;
  }

  // Always process newly added entities - they need to be scaled
  // even if zoom hasn't changed
  for (const entityId of scaleWithZoomQuery.addedOrChanged(ctx)) {
    scaleBlock(ctx, entityId, camera.zoom);
  }
});

/**
 * Scale a block based on the current zoom level.
 * The block maintains its screen-space size by scaling inversely with zoom.
 */
function scaleBlock(ctx: Context, entityId: EntityId, zoom: number): void {
  const block = Block.write(ctx, entityId);
  const swz = ScaleWithZoom.read(ctx, entityId);

  const scale = 1 / zoom;

  // Calculate scaled size: startSize * (1/zoom)
  Vec2.copy(_scaledSize, swz.startSize);
  Vec2.scale(_scaledSize, scale);

  // Calculate anchor offset: (startSize - scaledSize) * anchor
  Vec2.copy(_anchorOffset, swz.startSize);
  Vec2.sub(_anchorOffset, _scaledSize);
  Vec2.multiply(_anchorOffset, swz.anchor);

  // Apply position with anchor offset
  Vec2.copy(block.position, swz.startPosition);
  Vec2.add(block.position, _anchorOffset);

  Vec2.copy(block.size, _scaledSize);
}
