import {
  Block,
  Controls,
  defineEditorSystem,
  defineQuery,
  Edited,
  type EntityId,
  Grid,
  getPointerInput,
  hasComponent,
  type InferStateContext,
  isHeldByRemote,
  type PointerInput,
  Synced,
} from '@woven-canvas/core'
import { Vec2 as Vec2Ns } from '@woven-canvas/math'
import { and, assign, not, setup } from 'xstate'
import {
  AddHeld,
  AddSelectionBox,
  CloneEntities,
  DeselectAll,
  DragBlock,
  RemoveHeld,
  RemoveSelectionBox,
  SelectBlock,
  SetCursor,
  ToggleSelect,
  UncloneEntities,
  UpdateSelectionBox,
} from '../../commands'
import { Selected, TransformBox, TransformHandle } from '../../components'
import { CursorKind } from '../../cursors'
import { SelectionStateSingleton } from '../../singletons'
import { SelectionState } from '../../types'

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4

// Query for selected synced blocks (for cloning)
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected, Synced))

// Query for edited blocks (to prevent dragging during edit mode)
const editedBlocksQuery = defineQuery((q) => q.with(Block, Edited))

/**
 * Selection state machine context - derived from SelectionStateSingleton schema.
 */
type SelectionContext = InferStateContext<typeof SelectionStateSingleton>

/**
 * Selection state machine - created once at module level.
 *
 * The ECS context is available on events (ctx property) so actions
 * can access entities and other ECS state without recreating the machine.
 *
 * This machine handles:
 * - Clicking to select blocks
 * - Dragging blocks to move them
 * - Alt+drag to clone blocks
 * - Shift+click to toggle selection
 * - Selection box (marquee) for multi-select
 */
const selectionMachine = setup({
  types: {
    context: {} as SelectionContext,
    events: {} as PointerInput,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      const dist = Vec2Ns.distance(context.pointingStartClient, event.screenPosition)
      return dist >= POINTING_THRESHOLD
    },
    isOverBlock: ({ event }) => {
      return event.intersects.length > 0
    },
    isOverSyncedBlock: ({ event }) => {
      const ctx = event.ctx

      for (const entityId of event.intersects) {
        if (hasComponent(ctx, entityId, Synced)) {
          return true
        }
      }
      return false
    },
    isNotHeldByRemote: ({ event }) => {
      const ctx = event.ctx
      const entityId = event.intersects[0]
      if (!entityId) return true
      return !isHeldByRemote(ctx, entityId)
    },
    hasEditedBlocks: ({ event }) => {
      return editedBlocksQuery.current(event.ctx).length > 0
    },
  },
  actions: {
    setPointingStart: assign({
      pointingStartClient: ({ event }) => event.screenPosition,
      pointingStartWorld: ({ event }) => event.worldPosition,
    }),
    setDragStart: assign({
      dragStart: ({ event }) => event.worldPosition,
    }),
    addHeldToDragged: ({ context, event }) => {
      if (context.draggedEntity === null) return
      AddHeld.spawn(event.ctx, { entityId: context.draggedEntity })
    },
    removeHeldFromDragged: ({ context, event }) => {
      if (context.draggedEntity === null) return
      RemoveHeld.spawn(event.ctx, { entityId: context.draggedEntity })
    },
    setDragCursor: ({ event, context }) => {
      if (!context.draggedEntity) return

      // If dragging a transform handle, set cursor based on the handle being dragged
      // (not the hover state, which might be stale if mouse moved quickly)
      if (hasComponent(event.ctx, context.draggedEntity, TransformHandle)) {
        const handle = TransformHandle.read(event.ctx, context.draggedEntity)

        const transformBoxBlock = handle.transformBox !== null ? Block.read(event.ctx, handle.transformBox) : undefined
        SetCursor.spawn(event.ctx, {
          contextCursorKind: handle.cursorKind,
          contextRotation: transformBoxBlock?.rotateZ ?? 0,
        })
      } else {
        // For other entities (blocks, transform box), use drag cursor
        SetCursor.spawn(event.ctx, {
          contextCursorKind: CursorKind.Drag,
          contextRotation: 0,
        })
      }
    },
    unsetDragCursor: ({ event }) => {
      SetCursor.spawn(event.ctx, { contextCursorKind: '' })
    },
    setDraggedEntity: assign({
      draggedEntity: ({ event }) => event.intersects[0] ?? null,
      draggedEntityStart: ({ event }): [number, number] => {
        if (!event.intersects.length) return [0, 0]
        const entityId = event.intersects[0]
        const block = Block.read(event.ctx, entityId)
        return [block.position[0], block.position[1]]
      },
    }),
    resetDragged: ({ context, event }) => {
      if (context.draggedEntity === null) return

      // Reset block to original position
      DragBlock.spawn(event.ctx, {
        entityId: context.draggedEntity,
        position: context.draggedEntityStart,
      })

      // Unclone if we were cloning
      if (context.isCloning) {
        UncloneEntities.spawn(event.ctx, {
          entityIds: [context.draggedEntity],
          seed: context.cloneGeneratorSeed,
        })
      }
    },
    resetContext: assign({
      dragStart: (): [number, number] => [0, 0],
      pointingStartClient: (): [number, number] => [0, 0],
      pointingStartWorld: (): [number, number] => [0, 0],
      draggedEntityStart: (): [number, number] => [0, 0],
      draggedEntity: () => null,
      cloneGeneratorSeed: () => crypto.randomUUID(),
      isCloning: () => false,
    }),
    createSelectionBox: ({ event }) => {
      AddSelectionBox.spawn(event.ctx, undefined)
    },
    removeSelectionBox: ({ event }) => {
      RemoveSelectionBox.spawn(event.ctx, undefined)
    },
    updateDragged: assign({
      isCloning: ({ context, event }) => {
        const ctx = event.ctx
        if (context.draggedEntity === null) return false

        let left = context.draggedEntityStart[0] + event.worldPosition[0] - context.dragStart[0]
        let top = context.draggedEntityStart[1] + event.worldPosition[1] - context.dragStart[1]

        const draggingSynced =
          hasComponent(ctx, context.draggedEntity, Synced) || hasComponent(ctx, context.draggedEntity, TransformBox)

        // Shift constrains movement to axis
        if (event.shiftDown && draggingSynced) {
          const dx = Math.abs(event.worldPosition[0] - context.dragStart[0])
          const dy = Math.abs(event.worldPosition[1] - context.dragStart[1])
          if (dx > dy) {
            top = context.draggedEntityStart[1]
          } else {
            left = context.draggedEntityStart[0]
          }
        }

        // Apply grid snapping for synced blocks
        if (draggingSynced) {
          left = Grid.snapX(ctx, left)
          top = Grid.snapY(ctx, top)
        }

        // Move the block
        DragBlock.spawn(ctx, {
          entityId: context.draggedEntity,
          position: [left, top],
        })

        // Alt+drag to clone
        let isCloning = context.isCloning
        if (event.altDown && draggingSynced && !context.isCloning) {
          // Use the new position being set this frame (left, top), not the stale
          // block.position from the previous frame. This ensures the clone is
          // placed at the original start position, not offset by one frame of drag.
          const dx = context.draggedEntityStart[0] - left
          const dy = context.draggedEntityStart[1] - top

          isCloning = true

          // When dragging a TransformBox, clone all selected blocks
          // Otherwise just clone the single dragged entity
          const isTransformBox = hasComponent(ctx, context.draggedEntity, TransformBox)
          const entityIds = isTransformBox ? Array.from(selectedBlocksQuery.current(ctx)) : [context.draggedEntity]

          CloneEntities.spawn(ctx, {
            entityIds,
            offset: [dx, dy],
            seed: context.cloneGeneratorSeed,
          })
        } else if (!event.altDown && context.isCloning) {
          // Alt released - unclone
          const isTransformBox = hasComponent(ctx, context.draggedEntity, TransformBox)
          const entityIds = isTransformBox ? Array.from(selectedBlocksQuery.current(ctx)) : [context.draggedEntity]

          UncloneEntities.spawn(ctx, {
            entityIds,
            seed: context.cloneGeneratorSeed,
          })
          isCloning = false
        }

        return isCloning
      },
    }),
    resizeSelectionBox: ({ context, event }) => {
      const left = Math.min(context.pointingStartWorld[0], event.worldPosition[0])
      const top = Math.min(context.pointingStartWorld[1], event.worldPosition[1])
      const right = Math.max(context.pointingStartWorld[0], event.worldPosition[0])
      const bottom = Math.max(context.pointingStartWorld[1], event.worldPosition[1])

      UpdateSelectionBox.spawn(event.ctx, {
        bounds: [left, top, right, bottom],
        deselectOthers: !event.shiftDown,
      })
    },
    selectIntersect: ({ event }) => {
      const ctx = event.ctx
      let intersectId: EntityId | undefined

      for (const entityId of event.intersects) {
        if (hasComponent(ctx, entityId, Synced)) {
          intersectId = entityId
          break
        }
      }

      if (intersectId === undefined) return

      if (event.shiftDown) {
        ToggleSelect.spawn(ctx, { entityId: intersectId })
      } else {
        SelectBlock.spawn(ctx, {
          entityId: intersectId,
          deselectOthers: true,
        })
      }
    },
    selectDragged: ({ context, event }) => {
      if (context.draggedEntity === null) return
      if (!hasComponent(event.ctx, context.draggedEntity, Synced)) return

      SelectBlock.spawn(event.ctx, {
        entityId: context.draggedEntity,
        deselectOthers: true,
      })
    },
    deselectAllIfShiftNotDown: ({ event }) => {
      if (event.shiftDown) return
      DeselectAll.spawn(event.ctx, undefined)
    },
    deselectAllIfDraggedNotSelected: ({ context, event }) => {
      if (context.draggedEntity === null) return
      // Don't deselect if dragging a selected block
      if (hasComponent(event.ctx, context.draggedEntity, Selected)) return
      // Don't deselect if dragging transform box or handle
      if (hasComponent(event.ctx, context.draggedEntity, TransformBox)) return
      if (hasComponent(event.ctx, context.draggedEntity, TransformHandle)) return
      DeselectAll.spawn(event.ctx, undefined)
    },
  },
}).createMachine({
  id: 'selection',
  initial: SelectionState.Idle,
  context: {
    dragStart: [0, 0],
    pointingStartClient: [0, 0],
    pointingStartWorld: [0, 0],
    draggedEntityStart: [0, 0],
    draggedEntity: null,
    cloneGeneratorSeed: crypto.randomUUID(),
    isCloning: false,
  },
  states: {
    [SelectionState.Idle]: {
      entry: ['resetContext'],
      on: {
        pointerDown: [
          {
            guard: and(['isOverBlock', 'isNotHeldByRemote']),
            target: SelectionState.Pointing,
          },
          {
            actions: 'deselectAllIfShiftNotDown',
            target: SelectionState.SelectionBoxPointing,
          },
        ],
      },
    },
    [SelectionState.Pointing]: {
      entry: ['setPointingStart', 'setDraggedEntity'],
      on: {
        pointerMove: {
          guard: and(['isThresholdReached', not('hasEditedBlocks')]),
          target: SelectionState.Dragging,
        },
        pointerUp: [
          {
            guard: 'isOverSyncedBlock',
            actions: 'selectIntersect',
            target: SelectionState.Idle,
          },
          {
            actions: 'deselectAllIfShiftNotDown',
            target: SelectionState.Idle,
          },
        ],
        cancel: {
          target: SelectionState.Idle,
        },
      },
    },
    [SelectionState.Dragging]: {
      entry: ['setDragStart', 'addHeldToDragged', 'setDragCursor', 'deselectAllIfDraggedNotSelected'],
      exit: ['unsetDragCursor'],
      on: {
        pointerMove: {
          actions: 'updateDragged',
        },
        pointerUp: {
          actions: 'selectDragged',
          target: SelectionState.Idle,
        },
        cancel: {
          actions: ['resetDragged', 'removeHeldFromDragged'],
          target: SelectionState.Idle,
        },
      },
    },
    [SelectionState.SelectionBoxPointing]: {
      entry: ['setPointingStart'],
      on: {
        pointerMove: {
          guard: 'isThresholdReached',
          target: SelectionState.SelectionBoxDragging,
        },
        pointerUp: {
          target: SelectionState.Idle,
        },
        cancel: {
          target: SelectionState.Idle,
        },
      },
    },
    [SelectionState.SelectionBoxDragging]: {
      entry: ['setDragStart', 'createSelectionBox'],
      exit: 'removeSelectionBox',
      on: {
        pointerMove: {
          actions: 'resizeSelectionBox',
        },
        pointerUp: {
          target: SelectionState.Idle,
        },
        cancel: {
          target: SelectionState.Idle,
        },
      },
    },
  },
})

/**
 * Pre-capture selection system - runs the selection state machine.
 *
 * Runs early in the capture phase (priority: 100) to handle pointer events for:
 * - Clicking to select blocks
 * - Dragging to move blocks
 * - Alt+drag to clone
 * - Shift+click to toggle selection
 * - Selection box (marquee) for multi-select
 */
export const selectSystem = defineEditorSystem({ phase: 'capture', priority: 100 }, (ctx) => {
  // Get pointer buttons mapped to 'select' tool
  let buttons = Controls.getButtons(ctx, 'select')

  // If already dragging, continue handling events regardless of tool
  const state = SelectionStateSingleton.read(ctx)
  if (state.state === SelectionState.Dragging && buttons.length === 0) {
    buttons = ['left']
  }

  // Get pointer events with intersection data
  const events = getPointerInput(ctx, buttons)

  if (events.length === 0) return

  SelectionStateSingleton.run(ctx, selectionMachine, events)
})
