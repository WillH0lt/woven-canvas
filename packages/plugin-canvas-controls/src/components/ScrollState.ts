import { CanvasSingletonDef, type Context, field } from '@woven-canvas/core'

const ScrollStateSchema = {
  /** Whether smooth scroll animation is active */
  active: field.boolean().default(false),
  /** Target camera left position */
  targetLeft: field.float64().default(0),
  /** Target camera top position */
  targetTop: field.float64().default(0),
  /** X velocity for smooth damp */
  velocityX: field.float64().default(0),
  /** Y velocity for smooth damp */
  velocityY: field.float64().default(0),
}

/**
 * Scroll state singleton - tracks smooth scroll target and velocity.
 *
 * When smooth scroll is enabled, wheel deltas accumulate into a target
 * position and the camera smoothly damps toward it each frame.
 */
class ScrollStateDef extends CanvasSingletonDef<typeof ScrollStateSchema> {
  constructor() {
    super({ name: 'scrollState' }, ScrollStateSchema)
  }

  /** Reset smooth scroll state, cancelling any active animation. */
  reset(ctx: Context) {
    const state = this.read(ctx)
    if (!state.active) return
    const ss = this.write(ctx)
    ss.active = false
    ss.velocityX = 0
    ss.velocityY = 0
  }
}

export const ScrollState = new ScrollStateDef()
