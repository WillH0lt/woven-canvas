import { defineSystem } from "@infinitecanvas/ecs";
import { Frame } from "../components";

/** Last frame timestamp, keyed by context readerId */
const lastFrameTime = new Map<string, number>();

/**
 * Frame input system - updates frame timing at the start of each tick.
 *
 * This system should run first in the input phase to ensure
 * frame.delta is available to all other systems.
 */
export const frameInputSystem = defineSystem((ctx) => {
  const now = performance.now();
  const last = lastFrameTime.get(ctx.readerId);
  lastFrameTime.set(ctx.readerId, now);

  const frame = Frame.write(ctx);
  frame.number++;
  frame.time = now;

  if (last === undefined) {
    // First frame, assume 16ms (60fps)
    frame.delta = 0.016;
  } else {
    // Convert to seconds, clamp to reasonable range (max 100ms)
    frame.delta = Math.min((now - last) / 1000, 0.1);
  }
});
