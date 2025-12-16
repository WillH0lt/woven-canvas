import {
  type Context,
  defineSystem,
  Camera,
  Screen,
  Mouse,
  Keyboard,
  Controls,
  getMouseInput,
  getPluginResources,
} from "@infinitecanvas/editor";

import type { ControlsOptions } from "../types";

/**
 * Capture zoom system - handles mouse scroll zoom with modifier key.
 *
 * Zooms toward the mouse cursor position, maintaining the world point
 * under the cursor. Respects minZoom and maxZoom bounds.
 *
 * Active when: Mouse wheel scrolled and "zoom" tool is active for wheel input.
 */
export const captureZoomSystem = defineSystem((ctx: Context) => {
  const options = getPluginResources<ControlsOptions>(ctx, "controls");
  const keyboard = Keyboard.read(ctx);

  // Only zoom when the zoom tool is active for wheel input
  if (!Controls.wheelActive(ctx, "zoom", keyboard.modDown)) return;

  // Check for wheel event
  const mouseEvents = getMouseInput(ctx);
  const wheelEvent = mouseEvents.find((e) => e.type === "wheel");
  if (!wheelEvent) return;

  const camera = Camera.read(ctx);
  const screen = Screen.read(ctx);
  const mouse = Mouse.read(ctx);

  // Calculate new zoom level with exponential scaling
  // Factor: 2^(-0.8 * wheelDeltaY / 500) gives smooth zoom feel
  let zoom = 2 ** ((-0.8 * wheelEvent.wheelDeltaY) / 500) * camera.zoom;

  // Clamp to min/max bounds
  zoom = Math.min(options.maxZoom, Math.max(options.minZoom, zoom));

  // Calculate viewport size change
  const cameraWidth = screen.width / camera.zoom;
  const cameraHeight = screen.height / camera.zoom;
  const newCameraWidth = screen.width / zoom;
  const newCameraHeight = screen.height / zoom;

  const dx = newCameraWidth - cameraWidth;
  const dy = newCameraHeight - cameraHeight;

  // Calculate mouse position as percentage of screen
  const percentX = mouse.position[0] / screen.width;
  const percentY = mouse.position[1] / screen.height;

  // Offset camera so world point under cursor stays fixed
  const left = camera.left - percentX * dx;
  const top = camera.top - percentY * dy;

  // Update camera
  const cam = Camera.write(ctx);
  cam.left = left;
  cam.top = top;
  cam.zoom = zoom;
});
