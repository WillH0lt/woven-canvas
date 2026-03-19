import { CanvasSingletonDef, type Context, field } from '@woven-canvas/core'

const ZoomStateSchema = {
  /** Whether smooth zoom animation is active */
  active: field.boolean().default(false),
  /** Target zoom level */
  targetZoom: field.float64().default(1),
  /** Zoom velocity for smooth damp */
  velocity: field.float64().default(0),
  /** Screen X of the zoom anchor point (mouse position when zoom started) */
  anchorX: field.float64().default(0),
  /** Screen Y of the zoom anchor point */
  anchorY: field.float64().default(0),
}

/**
 * Zoom state singleton - tracks smooth zoom target and velocity.
 *
 * When smooth zoom is enabled, wheel deltas accumulate into a target
 * zoom level and the camera smoothly damps toward it each frame.
 * The anchor point ensures the world point under the cursor stays fixed.
 */
class ZoomStateDef extends CanvasSingletonDef<typeof ZoomStateSchema> {
  constructor() {
    super({ name: 'zoomState' }, ZoomStateSchema)
  }

  /** Reset smooth zoom state, cancelling any active animation. */
  reset(ctx: Context) {
    const state = this.read(ctx)
    if (!state.active) return
    const zs = this.write(ctx)
    zs.active = false
    zs.velocity = 0
  }
}

export const ZoomState = new ZoomStateDef()
