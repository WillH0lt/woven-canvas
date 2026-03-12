import { defineCanvasSingleton, field } from '@woven-canvas/core'

/**
 * Scroll state singleton - tracks smooth scroll target and velocity.
 *
 * When smooth scroll is enabled, wheel deltas accumulate into a target
 * position and the camera smoothly damps toward it each frame.
 */
export const ScrollState = defineCanvasSingleton(
  { name: 'scrollState' },
  {
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
  },
)
