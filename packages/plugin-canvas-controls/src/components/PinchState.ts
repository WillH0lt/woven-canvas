import { defineCanvasSingleton, field } from '@woven-canvas/core'

/**
 * Pinch state singleton - stores state for two-finger pinch/pan gestures.
 */
export const PinchState = defineCanvasSingleton(
  { name: 'pinchState' },
  {
    /** Whether a pinch gesture is currently active */
    active: field.boolean().default(false),
    /** Previous distance between two fingers */
    prevDistance: field.float64().default(0),
    /** Previous center point between two fingers [x, y] */
    prevCenter: field.tuple(field.float64(), 2).default([0, 0]),
  },
)
