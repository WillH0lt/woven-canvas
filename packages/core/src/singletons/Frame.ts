import { field } from "@woven-ecs/core";
import { defineCanvasSingleton } from "@woven-ecs/canvas-store";

/**
 * Frame singleton - tracks frame timing information.
 *
 * Updated automatically at the start of each tick by the Editor.
 * Use this to access delta time for animations and physics calculations.
 *
 * @example
 * ```typescript
 * const mySystem = defineSystem((ctx) => {
 *   const frame = Frame.read(ctx);
 *   // Use frame.delta for time-based calculations
 *   position += velocity * frame.delta;
 * });
 * ```
 */
export const Frame = defineCanvasSingleton(
  { name: "frame" },
  {
    /** Current frame number (increments each tick) */
    number: field.uint32().default(0),
    /** Time since last frame in seconds */
    delta: field.float64().default(0),
    /** Timestamp of current frame in milliseconds (from performance.now()) */
    time: field.float64().default(0),
    /** Timestamp of previous frame in milliseconds (0 if first frame) */
    lastTime: field.float64().default(0),
  }
);
