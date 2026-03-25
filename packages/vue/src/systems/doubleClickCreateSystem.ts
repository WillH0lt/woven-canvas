import {
  addComponent,
  type Context,
  Controls,
  canBlockEdit,
  defineEditorSystem,
  type EditorResources,
  getPointerInput,
  getResources,
  PointerButton,
} from '@woven-canvas/core'
import { EditAfterPlacing, Selected } from '@woven-canvas/plugin-selection'
import { DoubleClickState } from '../singletons'
import { type BlockSnapshot, createBlockFromSnapshot } from './blockPlacementSystem'

/** Time window for double-click detection (ms) */
const DOUBLE_CLICK_TIME_MS = 400
/** Max distance between clicks to count as double-click (world units) */
const DOUBLE_CLICK_DISTANCE = 10

/**
 * Double-click create system — places a block when the user double-clicks
 * on empty canvas (no existing block under cursor).
 *
 * Reads the snapshot to place from the DoubleClickState singleton.
 * Set DoubleClickState.snapshot to a JSON-serialized BlockSnapshot to enable,
 * or leave empty to disable.
 */
export const doubleClickCreateSystem = defineEditorSystem({ phase: 'capture' }, (ctx: Context) => {
  const dblState = DoubleClickState.read(ctx)
  if (!dblState.snapshot) return

  const controls = Controls.read(ctx)

  // Only active when using the select tool and no snapshot is being placed
  if (controls.leftMouseTool !== 'select' || controls.heldSnapshot) return

  const events = getPointerInput(ctx, [PointerButton.Left])
  if (events.length === 0) return

  const clickEvent = events.find((e) => e.type === 'click' && !e.obscured)
  if (!clickEvent) return

  // Only trigger on empty canvas (no blocks under cursor)
  if (clickEvent.intersects.length > 0) return

  const now = performance.now()
  const timeDelta = now - dblState.lastClickTime
  const dx = clickEvent.worldPosition[0] - dblState.lastClickWorldX
  const dy = clickEvent.worldPosition[1] - dblState.lastClickWorldY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (timeDelta < DOUBLE_CLICK_TIME_MS && dist < DOUBLE_CLICK_DISTANCE) {
    // Parse the snapshot
    let snapshot: BlockSnapshot
    try {
      snapshot = JSON.parse(dblState.snapshot) as BlockSnapshot
    } catch {
      return
    }
    if (!snapshot.block?.tag) return

    // Verify the block definition is registered for this tag
    const { editor } = getResources<EditorResources>(ctx)
    if (!(snapshot.block.tag in editor.blockDefs)) return

    // Double-click detected — create block
    const tag = snapshot.block.tag
    const entityId = createBlockFromSnapshot(ctx, snapshot, clickEvent.worldPosition)

    // Directly select the block (pointer is already released after double-click,
    // so the Pointing → pointerUp flow won't work)
    addComponent(ctx, entityId, Selected, {})

    // Mark for immediate editing if the block supports it
    if (canBlockEdit(ctx, tag)) {
      addComponent(ctx, entityId, EditAfterPlacing, {})
    }

    // Reset last click so a third click doesn't trigger again
    const stateWrite = DoubleClickState.write(ctx)
    stateWrite.lastClickTime = 0
    stateWrite.lastClickWorldX = 0
    stateWrite.lastClickWorldY = 0
  } else {
    // Record this click for potential double-click
    const stateWrite = DoubleClickState.write(ctx)
    stateWrite.lastClickTime = now
    stateWrite.lastClickWorldX = clickEvent.worldPosition[0]
    stateWrite.lastClickWorldY = clickEvent.worldPosition[1]
  }
})
