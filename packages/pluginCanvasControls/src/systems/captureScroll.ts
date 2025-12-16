import {
  type Context,
  defineSystem,
  Camera,
  Keyboard,
  Controls,
  getMouseInput,
} from "@infinitecanvas/editor";

/**
 * Capture scroll system - handles mouse scroll canvas panning.
 *
 * Pans the canvas based on wheel deltas. Only active when
 * the "scroll" tool is active for wheel input.
 *
 * Active when: Mouse wheel scrolled and "scroll" tool is active.
 */
export const captureScrollSystem = defineSystem((ctx: Context) => {
  const keyboard = Keyboard.read(ctx);

  // Only scroll when the scroll tool is active for wheel input
  if (!Controls.wheelActive(ctx, "scroll", keyboard.modDown)) return;

  // Check for wheel event
  const mouseEvents = getMouseInput(ctx);
  const wheelEvent = mouseEvents.find((e) => e.type === "wheel");
  if (!wheelEvent) return;

  const camera = Camera.read(ctx);

  // Pan camera based on wheel deltas, adjusted for zoom level
  const left = camera.left + wheelEvent.wheelDeltaX / camera.zoom;
  const top = camera.top + wheelEvent.wheelDeltaY / camera.zoom;

  // Update camera
  const cam = Camera.write(ctx);
  cam.left = left;
  cam.top = top;
});
