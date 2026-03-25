import { field } from '@woven-canvas/core'
import { defineCanvasSingleton } from '@woven-ecs/canvas-store'

const DEFAULT_SNAPSHOT = JSON.stringify({
  block: { tag: 'text', size: [10, 29] },
  text: { constrainWidth: false, fontSizePx: 24 },
})

/**
 * DoubleClickState singleton - tracks the last click for double-click detection
 * and holds the snapshot JSON to place on double-click.
 *
 * Set `snapshot` to a JSON-serialized BlockSnapshot to enable double-click creation,
 * or set to empty string to disable.
 */
export const DoubleClickState = defineCanvasSingleton(
  { name: 'doubleClickState' },
  {
    /** JSON-serialized BlockSnapshot, or empty string to disable */
    snapshot: field.string().max(1024).default(DEFAULT_SNAPSHOT),
    lastClickTime: field.float64().default(0),
    lastClickWorldX: field.float64().default(0),
    lastClickWorldY: field.float64().default(0),
  },
)
