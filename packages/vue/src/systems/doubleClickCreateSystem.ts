import {
  addComponent,
  type Context,
  Controls,
  canBlockEdit,
  defineEditorSystem,
  EditAfterPlacing,
  type EditorResources,
  Frame,
  getPluginResources,
  getPointerInput,
  getResources,
  hasComponent,
  isReadonly,
  PlaceBlockEvent,
  PointerButton,
  Selected,
  Text,
} from '@woven-canvas/core'
import { EDITING_PLUGIN_NAME } from '../constants'
import type { EditingPluginResources } from '../EditingPlugin'
import { applyCreationDefaults, type BlockSnapshot, createBlockFromSnapshot } from '../helpers/snapshot'
import { DoubleClickState } from '../singletons'

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
  if (isReadonly(ctx)) return

  const dblState = DoubleClickState.read(ctx)
  if (!dblState.snapshot) return

  const controls = Controls.read(ctx)

  // Only active when using the select tool and no snapshot is being placed
  if (controls.leftMouseTool !== 'select' || controls.heldSnapshot) return

  const events = getPointerInput(ctx, [PointerButton.Left])
  if (events.length === 0) return

  const clickEvent = events.find((e) => e.type === 'click' && !e.obscured)
  if (!clickEvent) return

  // Only trigger on empty canvas or on frames (no non-frame blocks under cursor)
  const hasNonFrameIntersect = clickEvent.intersects.some((id) => !hasComponent(ctx, id, Frame))
  if (hasNonFrameIntersect) return

  const now = performance.now()
  const timeDelta = now - dblState.lastClickTime
  const dx = clickEvent.worldPosition[0] - dblState.lastClickWorldX
  const dy = clickEvent.worldPosition[1] - dblState.lastClickWorldY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (timeDelta < DOUBLE_CLICK_TIME_MS && dist < DOUBLE_CLICK_DISTANCE) {
    // Parse the snapshot
    let parsed: BlockSnapshot
    try {
      parsed = JSON.parse(dblState.snapshot) as BlockSnapshot
    } catch {
      return
    }
    if (!parsed.block?.tag) return

    // Fill any omitted component fields (e.g. text.fontFamily) from the canvas
    // creation defaults so double-click inherits the last-used font/size.
    const { getDefaults } = getPluginResources<EditingPluginResources>(ctx, EDITING_PLUGIN_NAME)
    const snapshot = applyCreationDefaults(parsed, getDefaults)

    // Verify the block definition is registered for this tag
    const { editor } = getResources<EditorResources>(ctx)
    if (!(snapshot.block.tag in editor.blockDefs)) return

    // Double-click detected — create block
    const entityId = createBlockFromSnapshot(ctx, snapshot, clickEvent.worldPosition)

    // Place into the page (frame + layer handled by PlaceBlockEvent, from the block's position).
    PlaceBlockEvent.spawn(ctx, { entityId })

    // Default empty fontFamily to the first registered font
    if (hasComponent(ctx, entityId, Text)) {
      const text = Text.read(ctx, entityId)
      if (!text.fontFamily) {
        const firstFont = editor.fonts[0]?.name
        if (firstFont) {
          Text.write(ctx, entityId).fontFamily = firstFont
        }
      }
    }

    // Directly select the block (pointer is already released after double-click,
    // so the Pointing → pointerUp flow won't work)
    addComponent(ctx, entityId, Selected, {})

    // Mark for immediate editing if the block supports it
    if (canBlockEdit(ctx, snapshot.block.tag)) {
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
