import { Scalar, Vec2 } from '@woven-canvas/math'
import { type Context, defineQuery, type EntityId } from '@woven-ecs/core'
import { Block, ScaleWithZoom } from '../../components'
import { defineEditorSystem } from '../../EditorSystem'
import { Camera, ScaleWithZoomState } from '../../singletons'

// Query for entities with ScaleWithZoom
const scaleWithZoomQuery = defineQuery((q) => q.with(Block).tracking(ScaleWithZoom))

// Pre-allocated vectors to avoid allocations in hot path
const _scaledSize: Vec2 = [0, 0]
const _anchorOffset: Vec2 = [0, 0]
const _anchorAdj: Vec2 = [0, 0]

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
export const scaleWithZoomSystem = defineEditorSystem({ phase: 'render', priority: 100 }, (ctx: Context) => {
  const camera = Camera.read(ctx)
  const state = ScaleWithZoomState.read(ctx)

  // Check if zoom changed
  const zoomChanged = !Scalar.approxEqual(camera.zoom, state.lastZoom)

  if (zoomChanged) {
    // Zoom changed - update all ScaleWithZoom entities
    for (const entityId of scaleWithZoomQuery.current(ctx)) {
      scaleBlock(ctx, entityId, camera.zoom)
    }
    ScaleWithZoomState.write(ctx).lastZoom = camera.zoom
  }

  // Always process newly added entities - they need to be scaled
  // even if zoom hasn't changed
  for (const entityId of scaleWithZoomQuery.addedOrChanged(ctx)) {
    scaleBlock(ctx, entityId, camera.zoom)
  }
})

/**
 * Scale a block based on the current zoom level.
 * The block maintains its screen-space size by scaling inversely with zoom.
 * Uses scaleMultiplier to control how much zoom affects each dimension.
 */
function scaleBlock(ctx: Context, entityId: EntityId, zoom: number): void {
  const block = Block.write(ctx, entityId)
  const swz = ScaleWithZoom.read(ctx, entityId)

  const baseScale = 1 / zoom

  // Calculate scaled size per dimension based on scaleMultiplier
  // multiplier: 0 = no zoom effect (keeps startSize), 1 = full zoom effect, 0.5 = half effect
  // Interpolate between startSize and fully scaled size based on multiplier
  const scaleX = 1 + (baseScale - 1) * swz.scaleMultiplier[0]
  const scaleY = 1 + (baseScale - 1) * swz.scaleMultiplier[1]
  _scaledSize[0] = swz.startSize[0] * scaleX
  _scaledSize[1] = swz.startSize[1] * scaleY

  // Calculate anchor offset accounting for block rotation.
  // delta = startSize - scaledSize
  Vec2.copy(_anchorOffset, swz.startSize)
  Vec2.sub(_anchorOffset, _scaledSize)

  if (block.rotateZ !== 0) {
    // For rotated blocks, the anchor point in world space is:
    //   blockCenter + rotate(size * (anchor - 0.5), rotateZ)
    // To keep it fixed as size changes:
    //   offset = delta/2 + rotate(delta * (anchor - 0.5), rotateZ)
    _anchorAdj[0] = _anchorOffset[0] * (swz.anchor[0] - 0.5)
    _anchorAdj[1] = _anchorOffset[1] * (swz.anchor[1] - 0.5)
    Vec2.rotate(_anchorAdj, block.rotateZ)
    _anchorOffset[0] = _anchorOffset[0] * 0.5 + _anchorAdj[0]
    _anchorOffset[1] = _anchorOffset[1] * 0.5 + _anchorAdj[1]
  } else {
    // Non-rotated: simple anchor multiply (equivalent to above when rotateZ=0)
    Vec2.multiply(_anchorOffset, swz.anchor)
  }

  // Apply position with anchor offset
  Vec2.copy(block.position, swz.startPosition)
  Vec2.add(block.position, _anchorOffset)

  Vec2.copy(block.size, _scaledSize)
}
