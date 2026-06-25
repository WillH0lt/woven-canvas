import { addComponent, type Context, hasComponent, removeComponent } from '@woven-ecs/core'
import { on } from '../../command'
import {
  AddFrameHighlight,
  AssignFrameChildren,
  PlaceBlockEvent,
  RemoveFrameHighlight,
} from '../../commands/containment'
import { Block } from '../../components/Block'
import { FrameDropTarget } from '../../components/FrameDropTarget'
import { defineEditorSystem } from '../../EditorSystem'
import { findFrameAtPoint } from '../../helpers/findFrameAtPoint'

/**
 * Update frame containment system - processes containment commands.
 *
 * Handles:
 * - AddFrameHighlight: add FrameDropTarget component for visual feedback
 * - RemoveFrameHighlight: remove FrameDropTarget component
 * - AssignFrameChildren: set/clear Block.parentId and convert positions
 * - PlaceBlockEvent: drop a freshly-created block onto the frame under its center
 */
export const updateFrameContainmentSystem = defineEditorSystem({ phase: 'update', priority: -10 }, (ctx: Context) => {
  on(ctx, AddFrameHighlight, (ctx, { frameId }) => {
    if (!hasComponent(ctx, frameId, FrameDropTarget)) {
      addComponent(ctx, frameId, FrameDropTarget)
    }
  })

  // Generic half of PlaceBlockEvent: parent a just-created block to the frame under its
  // center point, keeping its world position. Skips a block the caller already
  // parented deliberately. App plugins (e.g. books → layer assignment) react to the
  // same command separately, at their own priority.
  on(ctx, PlaceBlockEvent, (ctx, { entityId }) => {
    if (!hasComponent(ctx, entityId, Block)) return
    if (Block.read(ctx, entityId).parentId !== null) return
    // Resolve the target frame by the block's center, not its top-left corner.
    const center = Block.getCenter(ctx, entityId)
    const frameId = findFrameAtPoint(ctx, center, entityId)
    if (frameId === null) return
    const worldPos = Block.getWorldPosition(ctx, entityId)
    Block.write(ctx, entityId).parentId = frameId
    Block.setWorldPosition(ctx, entityId, worldPos)
  })

  on(ctx, RemoveFrameHighlight, (ctx, { frameId }) => {
    if (hasComponent(ctx, frameId, FrameDropTarget)) {
      removeComponent(ctx, frameId, FrameDropTarget)
    }
  })

  on(ctx, AssignFrameChildren, (ctx, { assignments }) => {
    for (const { entityId, frameId } of assignments) {
      if (!hasComponent(ctx, entityId, Block)) continue

      const currentParentId = Block.read(ctx, entityId).parentId

      if (frameId !== null) {
        // Assigning to a frame — convert position from current space to new parent-local
        if (currentParentId !== frameId) {
          // Get current world position before reparenting
          const worldPos = Block.getWorldPosition(ctx, entityId)
          // Set the new parent
          const block = Block.write(ctx, entityId)
          block.parentId = frameId
          // Convert world position to new parent-local
          Block.setWorldPosition(ctx, entityId, worldPos)
        }
      } else {
        // Removing from frame — convert position from parent-local to world
        if (currentParentId !== null) {
          // Get current world position before unparenting
          const worldPos = Block.getWorldPosition(ctx, entityId)
          // Clear the parent
          const block = Block.write(ctx, entityId)
          block.parentId = null
          // Set world position directly (no parent now)
          Block.setWorldPosition(ctx, entityId, worldPos)
        }
      }
    }
  })
})
