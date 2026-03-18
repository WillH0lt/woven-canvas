import { defineCanvasSingleton, field } from '@woven-canvas/core'

/**
 * Glide state singleton - drives smooth camera glide animations.
 *
 * Set `active` to true and provide target coordinates to start a glide.
 * The CameraGlideSystem reads this each frame and applies smoothDamp.
 */
export const GlideState = defineCanvasSingleton(
  { name: 'glideState', sync: 'none' },
  {
    /** Whether a glide animation is currently active */
    active: field.boolean().default(false),
    /** Target camera left position (world coordinates) */
    targetLeft: field.float64().default(0),
    /** Target camera top position (world coordinates) */
    targetTop: field.float64().default(0),
    /** Current X velocity for smoothDamp */
    velocityX: field.float64().default(0),
    /** Current Y velocity for smoothDamp */
    velocityY: field.float64().default(0),
  },
)
