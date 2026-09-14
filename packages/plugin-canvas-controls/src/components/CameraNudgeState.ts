import { defineCanvasSingleton, field } from '@woven-canvas/core'

/** Target and velocity for keyboard camera motion, independent of wheel scrolling. */
export const CameraNudgeState = defineCanvasSingleton(
  { name: 'cameraNudgeState', sync: 'none' },
  {
    active: field.boolean().default(false),
    targetLeft: field.float64().default(0),
    targetTop: field.float64().default(0),
    velocityX: field.float64().default(0),
    velocityY: field.float64().default(0),
    // Stop easing if another control changes the camera between frames.
    expectedLeft: field.float64().default(0),
    expectedTop: field.float64().default(0),
    expectedZoom: field.float64().default(1),
  },
)
