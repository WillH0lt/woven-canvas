import type { Context } from "@infinitecanvas/ecs";

import type { FrameInput } from "./types";
import { Frame } from "../components";

/**
 * Generate a frame input event from ECS state for state machine consumption.
 *
 * This function provides frame timing information as a standardized event
 * suitable for XState machines. Useful for driving animations and
 * time-based state transitions (e.g., camera glide, tweens).
 *
 * @param ctx - ECS context
 * @returns A frame input event
 *
 * @example
 * ```typescript
 * import { getFrameInput } from '@infinitecanvas/editor';
 *
 * const glideSystem = defineSystem((ctx) => {
 *   const state = GlideState.read(ctx);
 *   if (state.state !== 'gliding') return;
 *
 *   const frameEvent = getFrameInput(ctx);
 *   GlideState.run(ctx, glideMachine, [frameEvent]);
 * });
 * ```
 */
export function getFrameInput(ctx: Context): FrameInput {
  const frame = Frame.read(ctx);

  return {
    type: "frame",
    ctx,
    delta: frame.delta,
    frameNumber: frame.number,
    time: frame.time,
  };
}
