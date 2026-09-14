import { defineCanvasSingleton, field } from '@woven-canvas/core'

/** A shared repeat clock for held arrows, independent of native key repeat. */
export const KeyboardNudgeState = defineCanvasSingleton(
  { name: 'keyboardNudgeState', sync: 'none' },
  {
    /** Next repeat time in milliseconds; zero means no arrow gesture is active. */
    nextRepeatAt: field.float64().default(0),
  },
)
