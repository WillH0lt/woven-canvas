import { Synced } from '@woven-ecs/canvas-store'
import { type Context, defineQuery, type EntityId, hasComponent } from '@woven-ecs/core'
import { assign, setup } from 'xstate'
import { AddFrameHighlight, AssignFrameChildren, RemoveFrameHighlight } from '../../commands/containment'
import { Block } from '../../components/Block'
import { Selected } from '../../components/Selected'
import { TransformBox } from '../../components/TransformBox'
import type { InferStateContext } from '../../EditorStateDef'
import { defineEditorSystem } from '../../EditorSystem'
import type { PointerInput } from '../../events'
import { getPointerInput } from '../../events'
import { findFrameAtPoint } from '../../helpers/findFrameAtPoint'
import { isAncestor } from '../../helpers/hierarchy'
import { Controls } from '../../singletons/Controls'
import { FrameContainmentState } from '../../singletons/FrameContainmentState'
import { SelectionStateSingleton } from '../../singletons/SelectionStateSingleton'
import { FrameContainmentStateEnum, SelectionState } from '../../types'

const selectedQuery = defineQuery((q) => q.with(Block, Selected))

/**
 * Spawn AssignFrameChildren command for the dragged blocks.
 */
function spawnAssignments(ctx: Context, draggedEntity: EntityId | null, targetFrame: EntityId | null): void {
  if (draggedEntity === null) return

  const assignments: Array<{ entityId: EntityId; frameId: EntityId | null }> = []

  if (hasComponent(ctx, draggedEntity, TransformBox)) {
    for (const blockId of selectedQuery.current(ctx)) {
      // Skip if assigning this block to targetFrame would create a cycle
      if (targetFrame !== null && blockId === targetFrame) continue
      if (targetFrame !== null && isAncestor(ctx, targetFrame, blockId)) continue
      assignments.push({ entityId: blockId, frameId: targetFrame })
    }
  } else if (hasComponent(ctx, draggedEntity, Synced)) {
    if (targetFrame !== null && draggedEntity === targetFrame) return
    if (targetFrame !== null && isAncestor(ctx, targetFrame, draggedEntity)) return
    assignments.push({ entityId: draggedEntity, frameId: targetFrame })
  }

  if (assignments.length > 0) {
    AssignFrameChildren.spawn(ctx, { assignments })
  }
}

type FrameContainmentContext = InferStateContext<typeof FrameContainmentState>

/**
 * Get the dragged entity ID from the selection state machine.
 */
function getDraggedEntity(ctx: Context): EntityId | null {
  const selState = SelectionStateSingleton.read(ctx)
  if (selState.state !== SelectionState.Dragging) return null
  return selState.draggedEntity
}

const frameContainmentMachine = setup({
  types: {
    context: {} as FrameContainmentContext,
    events: {} as PointerInput,
  },
  guards: {
    isSelectionDragging: ({ event }) => {
      const selState = SelectionStateSingleton.read(event.ctx)
      return selState.state === SelectionState.Dragging
    },
  },
  actions: {
    updateHighlight: assign({
      highlightedFrame: ({ context, event }) => {
        const ctx = event.ctx
        const pointerPos: [number, number] = [event.worldPosition[0], event.worldPosition[1]]
        const targetFrame = findFrameAtPoint(ctx, pointerPos, getDraggedEntity(ctx))

        const currentHighlight = context.highlightedFrame
        if (targetFrame !== currentHighlight) {
          if (currentHighlight !== null) {
            RemoveFrameHighlight.spawn(ctx, { frameId: currentHighlight })
          }
          if (targetFrame !== null) {
            AddFrameHighlight.spawn(ctx, { frameId: targetFrame })
          }

          // Immediately assign/remove frame child relationship for live clipping
          spawnAssignments(ctx, getDraggedEntity(ctx), targetFrame)
        }

        return targetFrame
      },
      draggedEntity: ({ context, event }) => getDraggedEntity(event.ctx) ?? context.draggedEntity,
    }),

    clearHighlight: ({ context, event }) => {
      if (context.highlightedFrame !== null) {
        RemoveFrameHighlight.spawn(event.ctx, { frameId: context.highlightedFrame })
      }
    },

    // Drop fallback. Tracking resolves the target frame from the CURSOR so the
    // highlight follows the hand, but a drag can release with the cursor off every
    // frame (the gutter between two pages, just past an edge) while the dragged
    // block itself still sits on one. Without this the block goes loose
    // (`parentId: null`) yet looks untouched — and anything that only renders a
    // frame's children (page captures / print) silently drops it. On pointerUp
    // with no cursor target, re-resolve by the dragged block's center — the same
    // rule paste and PlaceBlockEvent use — and parent it there.
    dropByCenter: ({ context, event }) => {
      if (context.highlightedFrame !== null) return
      const ctx = event.ctx
      const draggedEntity = context.draggedEntity
      if (draggedEntity === null || !hasComponent(ctx, draggedEntity, Block)) return
      const targetFrame = findFrameAtPoint(ctx, Block.getCenter(ctx, draggedEntity), draggedEntity)
      if (targetFrame !== null) spawnAssignments(ctx, draggedEntity, targetFrame)
    },

    resetContext: assign({
      highlightedFrame: () => null,
      draggedEntity: () => null,
    }),
  },
}).createMachine({
  id: 'frameContainment',
  initial: FrameContainmentStateEnum.Idle,
  context: {
    highlightedFrame: null,
    draggedEntity: null,
  },
  states: {
    [FrameContainmentStateEnum.Idle]: {
      entry: 'resetContext',
      on: {
        pointerMove: {
          guard: 'isSelectionDragging',
          actions: 'updateHighlight',
          target: FrameContainmentStateEnum.Tracking,
        },
      },
    },
    [FrameContainmentStateEnum.Tracking]: {
      on: {
        pointerMove: {
          actions: 'updateHighlight',
        },
        pointerUp: {
          actions: ['dropByCenter', 'clearHighlight'],
          target: FrameContainmentStateEnum.Idle,
        },
        cancel: {
          actions: 'clearHighlight',
          target: FrameContainmentStateEnum.Idle,
        },
      },
    },
  },
})

/**
 * Capture frame containment system - runs the containment state machine.
 *
 * Listens to pointer events on the select tool. When a drag is in progress,
 * tracks whether dragged blocks overlap frames and spawns highlight/containment commands.
 */
export const captureFrameContainmentSystem = defineEditorSystem({ phase: 'capture', priority: -10 }, (ctx: Context) => {
  let buttons = Controls.getButtons(ctx, 'select')

  // If already tracking, continue handling events regardless of tool
  const state = FrameContainmentState.read(ctx)
  if (state.state === FrameContainmentStateEnum.Tracking && buttons.length === 0) {
    buttons = ['left']
  }

  const events = getPointerInput(ctx, buttons)
  if (events.length === 0) return

  FrameContainmentState.run(ctx, frameContainmentMachine, events)
})
