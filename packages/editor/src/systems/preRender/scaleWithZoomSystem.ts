import { defineQuery, type Context, type EntityId } from "@infinitecanvas/ecs";
import { Vec2, Scalar } from "@infinitecanvas/math";

import { defineEditorSystem } from "../../EditorSystem";
import { Camera, ScaleWithZoomState } from "../../singletons";
import { Block, ScaleWithZoom } from "../../components";

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
 *
 * Runs early in the render phase (priority: 100) so other render systems
 * see the correctly scaled entities.
 */
export const scaleWithZoomSystem = defineEditorSystem({ phase: "render", priority: 100 }, (ctx: Context) => {
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
 * Uses scaleMultiplier to control how much zoom affects each dimension.
 */
function scaleBlock(ctx: Context, entityId: EntityId, zoom: number): void {
  const block = Block.write(ctx, entityId);
  const swz = ScaleWithZoom.read(ctx, entityId);

  const baseScale = 1 / zoom;

  // Calculate scaled size per dimension based on scaleMultiplier
  // multiplier: 0 = no zoom effect (keeps startSize), 1 = full zoom effect, 0.5 = half effect
  // Interpolate between startSize and fully scaled size based on multiplier
  const scaleX = 1 + (baseScale - 1) * swz.scaleMultiplier[0];
  const scaleY = 1 + (baseScale - 1) * swz.scaleMultiplier[1];
  _scaledSize[0] = swz.startSize[0] * scaleX;
  _scaledSize[1] = swz.startSize[1] * scaleY;

  // Calculate anchor offset: (startSize - scaledSize) * anchor
  Vec2.copy(_anchorOffset, swz.startSize);
  Vec2.sub(_anchorOffset, _scaledSize);
  Vec2.multiply(_anchorOffset, swz.anchor);

  // Apply position with anchor offset
  Vec2.copy(block.position, swz.startPosition);
  Vec2.add(block.position, _anchorOffset);

  Vec2.copy(block.size, _scaledSize);
}
