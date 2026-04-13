import { addComponent, type Context, hasComponent, removeComponent } from '@woven-ecs/core'
import { on } from '../../command'
import { AddFrameHighlight, AssignFrameChildren, RemoveFrameHighlight } from '../../commands/containment'
import { Block } from '../../components/Block'
import { FrameDropTarget } from '../../components/FrameDropTarget'
import { defineEditorSystem } from '../../EditorSystem'

/**
 * Update frame containment system - processes containment commands.
 *
 * Handles:
 * - AddFrameHighlight: add FrameDropTarget component for visual feedback
 * - RemoveFrameHighlight: remove FrameDropTarget component
 * - AssignFrameChildren: set/clear Block.parentId and convert positions
 */
export const updateFrameContainmentSystem = defineEditorSystem({ phase: 'update', priority: -10 }, (ctx: Context) => {
  on(ctx, AddFrameHighlight, (ctx, { frameId }) => {
    if (!hasComponent(ctx, frameId, FrameDropTarget)) {
      addComponent(ctx, frameId, FrameDropTarget)
    }
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
