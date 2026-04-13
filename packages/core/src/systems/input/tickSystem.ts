import { defineEditorSystem } from '../../EditorSystem'
import { Tick } from '../../singletons'

/**
 * Tick system - updates tick timing at the start of each tick.
 *
 * This system runs first in the input phase (priority: 100) to ensure
 * tick.delta is available to all other systems.
 */
export const tickSystem = defineEditorSystem({ phase: 'input', priority: 100 }, (ctx) => {
  const now = performance.now()
  const buffer = Tick._getInstance(ctx).buffer
  const last = buffer.lastTime[0]

  buffer.number[0]++
  buffer.lastTime[0] = now
  buffer.time[0] = now

  if (last === 0) {
    // First frame, assume 16ms (60fps)
    buffer.delta[0] = 0.016
  } else {
    // Convert to seconds, clamp to reasonable range (max 100ms)
    buffer.delta[0] = Math.min((now - last) / 1000, 0.1)
  }
})
