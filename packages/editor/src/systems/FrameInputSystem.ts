import { defineSystem } from "@infinitecanvas/ecs";
import { Frame } from "../components";

/**
 * Frame input system - updates frame timing at the start of each tick.
 *
 * This system should run first in the input phase to ensure
 * frame.delta is available to all other systems.
 */
export const frameInputSystem = defineSystem((ctx) => {
  const now = performance.now();
  const frame = Frame.write(ctx);
  const last = frame.lastTime;

  frame.number++;
  frame.lastTime = now;
  frame.time = now;

  if (last === 0) {
    // First frame, assume 16ms (60fps)
    frame.delta = 0.016;
  } else {
    // Convert to seconds, clamp to reasonable range (max 100ms)
    frame.delta = Math.min((now - last) / 1000, 0.1);
  }
});
