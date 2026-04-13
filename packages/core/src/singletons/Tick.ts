import { defineCanvasSingleton } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'

/**
 * Tick singleton - tracks tick timing information.
 *
 * Updated automatically at the start of each tick by the Editor.
 * Use this to access delta time for animations and physics calculations.
 *
 * @example
 * ```typescript
 * const mySystem = defineSystem((ctx) => {
 *   const tick = Tick.read(ctx);
 *   // Use tick.delta for time-based calculations
 *   position += velocity * tick.delta;
 * });
 * ```
 */
export const Tick = defineCanvasSingleton(
  { name: 'tick' },
  {
    /** Current tick number (increments each tick) */
    number: field.uint32().default(0),
    /** Time since last tick in seconds */
    delta: field.float64().default(0),
    /** Timestamp of current tick in milliseconds (from performance.now()) */
    time: field.float64().default(0),
    /** Timestamp of previous tick in milliseconds (0 if first tick) */
    lastTime: field.float64().default(0),
  },
)
