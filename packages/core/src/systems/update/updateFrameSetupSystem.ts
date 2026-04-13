import { addComponent, type Context, defineQuery, hasComponent } from '@woven-ecs/core'
import { Frame } from '../../components/Frame'
import { HitGeometry } from '../../components/HitGeometry'
import { FRAME_EDGE_THICKNESS } from '../../constants'
import { defineEditorSystem } from '../../EditorSystem'

const frameQuery = defineQuery((q) => q.tracking(Frame))

/**
 * Frame setup system - adds hit geometry to new frame entities.
 *
 * Watches for newly added Frame components and sets up 4 edge capsules
 * so that only the frame borders are clickable (interior clicks pass through).
 * Runs regardless of how the frame was created (draw tool, drag-out, paste, etc.).
 *
 * Capsules use UV coordinates (0-1), so they automatically map to the correct
 * world positions regardless of frame size.
 */
export const updateFrameSetupSystem = defineEditorSystem({ phase: 'update', priority: 100 }, (ctx: Context) => {
  // --- Hit geometry for new frames ---
  for (const entityId of frameQuery.added(ctx)) {
    if (hasComponent(ctx, entityId, HitGeometry)) continue

    addComponent(ctx, entityId, HitGeometry)
    // Top edge
    HitGeometry.addCapsuleUv(ctx, entityId, [0, 0], [1, 0], FRAME_EDGE_THICKNESS)
    // Right edge
    HitGeometry.addCapsuleUv(ctx, entityId, [1, 0], [1, 1], FRAME_EDGE_THICKNESS)
    // Bottom edge
    HitGeometry.addCapsuleUv(ctx, entityId, [1, 1], [0, 1], FRAME_EDGE_THICKNESS)
    // Left edge
    HitGeometry.addCapsuleUv(ctx, entityId, [0, 1], [0, 0], FRAME_EDGE_THICKNESS)
  }
})
