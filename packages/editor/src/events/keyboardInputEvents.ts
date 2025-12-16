import type { Context } from "@infinitecanvas/ecs";
import { Keyboard } from "../components/Keyboard";
import type { KeyboardInput, KeyboardInputType } from "./types";

/**
 * Get keyboard input events for specific keys.
 *
 * Checks the specified keys for press/release triggers and returns
 * corresponding events for state machine consumption.
 *
 * @param ctx - ECS context
 * @param keys - Array of key indices to check (use Key.A, Key.Escape, etc.)
 * @returns Array of keyboard input events that occurred this frame
 *
 * @example
 * ```ts
 * const events = getKeyboardInput(ctx, [Key.Escape, Key.Space]);
 * for (const event of events) {
 *   if (event.type === "keyDown" && event.key === Key.Escape) {
 *     // Handle escape pressed
 *   }
 * }
 * ```
 */
export function getKeyboardInput(
  ctx: Context,
  keys: number[]
): KeyboardInput[] {
  const events: KeyboardInput[] = [];

  for (const key of keys) {
    if (Keyboard.isKeyDownTrigger(ctx, key)) {
      events.push({ type: "keyDown", key, ctx });
    }
    if (Keyboard.isKeyUpTrigger(ctx, key)) {
      events.push({ type: "keyUp", key, ctx });
    }
  }

  return events;
}
