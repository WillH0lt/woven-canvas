import type { Context } from "@woven-ecs/core";
import type { Vec2 } from "@infinitecanvas/math";

import type { MouseInput } from "./types";
import { Camera, Mouse } from "../singletons";

/**
 * Generate high-level mouse input events from ECS state for state machine consumption.
 *
 * This function transforms raw Mouse singleton data into semantic events
 * suitable for XState machines. It handles:
 *
 * - **wheel** - Mouse wheel was scrolled (includes deltaX and deltaY)
 * - **mouseMove** - Mouse moved (without button pressed)
 *
 * Note: For pointer-based events (click, drag), use `getPointerInput` instead.
 * This function is specifically for wheel events and hover movement.
 *
 * @param ctx - ECS context
 * @returns Array of mouse input events to process
 *
 * @example
 * ```typescript
 * import { getMouseInput, runMachine } from '@infinitecanvas/plugin-xstate';
 *
 * const zoomSystem = defineSystem((ctx) => {
 *   const events = getMouseInput(ctx);
 *   if (events.length === 0) return;
 *
 *   const wheelEvents = events.filter(e => e.type === 'wheel');
 *   // Handle zoom...
 * });
 * ```
 */
export function getMouseInput(ctx: Context): MouseInput[] {
  const events: MouseInput[] = [];
  const mouse = Mouse.read(ctx);

  // Get screen position
  const screenPos: Vec2 = [mouse.position[0], mouse.position[1]];

  // Get world position using Camera component
  const worldPos = Camera.toWorld(ctx, screenPos);

  // Handle wheel event
  if (mouse.wheelTrigger) {
    events.push({
      type: "wheel",
      ctx,
      screenPosition: screenPos,
      worldPosition: worldPos,
      wheelDeltaX: mouse.wheelDeltaX,
      wheelDeltaY: mouse.wheelDeltaY,
    });
  }

  // Handle move event
  if (mouse.moveTrigger) {
    events.push({
      type: "mouseMove",
      ctx,
      screenPosition: screenPos,
      worldPosition: worldPos,
      wheelDeltaX: 0,
      wheelDeltaY: 0,
    });
  }

  return events;
}
