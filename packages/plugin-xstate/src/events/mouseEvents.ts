import { type Context } from "@infinitecanvas/editor";
import { Mouse } from "@infinitecanvas/plugin-input";
import type { MouseInput } from "./types";
import { type CameraProvider } from "./pointerEvents";

// Default camera provider (no camera - world = screen)
const defaultCameraProvider: CameraProvider = {
  getCamera: () => ({ left: 0, top: 0, zoom: 1 }),
  toWorld: (_ctx, screenPos) => screenPos,
};

// We'll share the camera provider with pointerEvents, but for isolation
// we maintain our own reference that can be set independently
let cameraProvider: CameraProvider = defaultCameraProvider;

/**
 * Set a custom camera provider for mouse world coordinate conversion.
 *
 * @param provider - Camera provider implementation
 */
export function setMouseCameraProvider(provider: CameraProvider): void {
  cameraProvider = provider;
}

/**
 * Reset the mouse camera provider to the default (no camera).
 */
export function resetMouseCameraProvider(): void {
  cameraProvider = defaultCameraProvider;
}

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
 * const zoomSystem = defineEditorSystem((ctx) => {
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
  const screenPos: [number, number] = [mouse.position[0], mouse.position[1]];

  // Get world position using camera provider
  const worldPos = cameraProvider.toWorld(ctx, screenPos);

  // Handle wheel event
  if (mouse.wheelTrigger) {
    events.push({
      type: "wheel",
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
      screenPosition: screenPos,
      worldPosition: worldPos,
      wheelDeltaX: 0,
      wheelDeltaY: 0,
    });
  }

  return events;
}

/**
 * Check if the mouse wheel was scrolled this frame.
 *
 * @param ctx - ECS context
 * @returns True if wheel was scrolled
 */
export function didMouseWheel(ctx: Context): boolean {
  return Mouse.didScroll(ctx);
}

/**
 * Check if the mouse moved this frame.
 *
 * @param ctx - ECS context
 * @returns True if mouse moved
 */
export function didMouseMove(ctx: Context): boolean {
  return Mouse.didMove(ctx);
}

/**
 * Get the current mouse position in screen coordinates.
 *
 * @param ctx - ECS context
 * @returns Position [x, y]
 */
export function getMousePosition(ctx: Context): [number, number] {
  return Mouse.getPosition(ctx);
}

/**
 * Get the current mouse position in world coordinates.
 *
 * @param ctx - ECS context
 * @returns World position [x, y]
 */
export function getMouseWorldPosition(ctx: Context): [number, number] {
  const screenPos = Mouse.getPosition(ctx);
  return cameraProvider.toWorld(ctx, screenPos);
}

/**
 * Get the mouse wheel delta.
 *
 * @param ctx - ECS context
 * @returns Wheel delta [dx, dy]
 */
export function getMouseWheelDelta(ctx: Context): [number, number] {
  return Mouse.getWheelDelta(ctx);
}
