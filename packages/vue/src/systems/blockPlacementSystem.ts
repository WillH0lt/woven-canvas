import {
  addComponent,
  Block,
  type Context,
  Controls,
  Cursor,
  canBlockEdit,
  defineEditorSystem,
  defineQuery,
  EditAfterPlacing,
  Edited,
  type EditorResources,
  findFrameAtPoint,
  getPluginResources,
  getPointerInput,
  getResources,
  Held,
  isReadonly,
  PointerButton,
  SelectionState,
  SelectionStateSingleton,
} from '@woven-canvas/core'

import { EDITING_PLUGIN_NAME } from '../constants'
import type { EditingPluginResources } from '../EditingPlugin'
import { type BlockSnapshot, createBlockFromSnapshot, parseSnapshot } from '../helpers/snapshot'
import { BlockPlacementState } from '../singletons'

// Re-export for consumers
export { type BlockSnapshot, createBlockFromSnapshot, parseSnapshot }

// Query for edited blocks
const editedQuery = defineQuery((q) => q.with(Edited))

/**
 * Place a block and set up selection state to Pointing.
 * The selectSystem will handle the threshold check, cursor, and deselection.
 */
function placeBlockAndSetupSelection(
  ctx: Context,
  snapshot: BlockSnapshot,
  worldPosition: [number, number],
  screenPosition: [number, number],
  mode: 'dragOut' | 'placement',
): void {
  // Create the block at the position
  const entityId = createBlockFromSnapshot(ctx, snapshot, worldPosition)

  // Assign to frame if placed inside one
  const frameId = findFrameAtPoint(ctx, worldPosition, entityId)
  if (frameId !== null) {
    // Get current world position, set parent, then convert to parent-local
    const currentWorldPos = Block.getWorldPosition(ctx, entityId)
    const block = Block.write(ctx, entityId)
    block.parentId = frameId
    Block.setWorldPosition(ctx, entityId, currentWorldPos)
  }

  // Mark as held for dragging
  const { sessionId } = getResources<EditorResources>(ctx)
  addComponent(ctx, entityId, Held, { sessionId })

  // Get the block's world position for draggedEntityStart
  const blockWorldPos = Block.getWorldPosition(ctx, entityId)

  // Mark block for editing after placement if it's editable
  if (canBlockEdit(ctx, snapshot.block.tag)) {
    addComponent(ctx, entityId, EditAfterPlacing, {})

    if (mode === 'placement') {
      // Create an undo checkpoint for the placement + edit
      // so we don't end up with un-edited blocks in uhistory
      const { store } = getPluginResources<EditingPluginResources>(ctx, EDITING_PLUGIN_NAME)
      const checkpointId = store.createCheckpoint()
      if (checkpointId) {
        const placementState = BlockPlacementState.write(ctx)
        placementState.editedCheckpoint = checkpointId
      }
    }
  }

  // Set SelectionStateSingleton to Pointing state
  // selectSystem will handle: threshold check -> Dragging transition -> cursor + deselect
  const selectionState = SelectionStateSingleton.write(ctx)
  selectionState.state = mode === 'dragOut' ? SelectionState.Dragging : SelectionState.Pointing
  selectionState.dragStart = worldPosition
  selectionState.draggedEntity = entityId
  selectionState.draggedEntityStart = blockWorldPos
  selectionState.pointingStartClient = screenPosition
  selectionState.pointingStartWorld = worldPosition
  selectionState.isCloning = false

  // Reset controls to select tool and clear snapshot
  const controlsWrite = Controls.write(ctx)
  controlsWrite.leftMouseTool = 'select'
  controlsWrite.activeToolName = 'select'
  controlsWrite.heldSnapshot = ''

  const cursor = Cursor.write(ctx)
  cursor.cursorKind = 'select'
  cursor.rotation = 0
}

function squashUndoHistory(ctx: Context): void {
  const placementState = BlockPlacementState.read(ctx)
  if (placementState.editedCheckpoint) {
    const cp = placementState.editedCheckpoint
    BlockPlacementState.write(ctx).editedCheckpoint = ''

    // Wait for state to settle before squashing
    const { store } = getPluginResources<EditingPluginResources>(ctx, EDITING_PLUGIN_NAME)
    store.onSettled(() => store.squashToCheckpoint(cp), { frames: 5 })
  }
}

/**
 * Block placement system - handles placing blocks from toolbar tools.
 *
 * Supports two modes:
 * 1. Click-to-place: When heldSnapshot is set and user clicks on canvas
 * 2. Drag-out: When leftMouseTool is "placement" and user drags from toolbar onto canvas
 *
 * In both cases:
 * - Creates the block on the triggering event
 * - Sets SelectionStateSingleton to Dragging state
 * - The selectSystem handles subsequent dragging and pointerUp (selecting)
 */
export const blockPlacementSystem = defineEditorSystem({ phase: 'capture' }, (ctx: Context) => {
  if (isReadonly(ctx)) return

  // Squash undo history when editing ends
  if (editedQuery.removed(ctx).length > 0 && editedQuery.current(ctx).length === 0) {
    squashUndoHistory(ctx)
  }

  const controls = Controls.read(ctx)

  // Only run when we have a snapshot to place
  if (!controls.heldSnapshot) return

  // Skip draw mode — handled by drawPlacementSystem
  if (controls.leftMouseTool === 'draw') return

  // Get pointer events for left mouse button
  const events = getPointerInput(ctx, [PointerButton.Left])
  if (events.length === 0) return

  // Parse and validate snapshot
  const snapshot = parseSnapshot(controls.heldSnapshot)
  if (!snapshot) return

  // Check if this is a drag-out or click-to-place
  const isDragOut = controls.leftMouseTool === 'drag-out'

  if (isDragOut) {
    // Drag-out mode: Look for pointerMove (user dragged from toolbar onto canvas)
    // The pointer is already down from the toolbar, so we trigger on first move
    const pointerMoveEvent = events.find((e) => e.type === 'pointerMove' && !e.obscured)
    if (!pointerMoveEvent) return

    placeBlockAndSetupSelection(
      ctx,
      snapshot,
      pointerMoveEvent.worldPosition,
      pointerMoveEvent.screenPosition,
      'dragOut',
    )
  } else {
    // Click-to-place mode: Look for pointerDown
    const pointerDownEvent = events.find((e) => e.type === 'pointerDown' && !e.obscured)
    if (!pointerDownEvent) return

    placeBlockAndSetupSelection(
      ctx,
      snapshot,
      pointerDownEvent.worldPosition,
      pointerDownEvent.screenPosition,
      'placement',
    )
  }
})
