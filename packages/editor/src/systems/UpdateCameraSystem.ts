import { type Context } from "@infinitecanvas/ecs";

import { defineEditorSystem } from "../System";
import { Camera } from "../components/Camera";

/**
 * Update camera system - handles camera state updates.
 *
 * Currently a placeholder that ensures camera state is valid.
 * Camera animation and controls will be handled by extension-controls.
 */
export const updateCameraSystem = defineEditorSystem((ctx: Context) => {
  const camera = Camera.read(ctx);

  // Ensure zoom is within valid bounds
  if (camera.zoom <= 0) {
    const cam = Camera.write(ctx);
    cam.zoom = 1;
  }

  // Future: This system can be extended to handle:
  // - Camera bounds clamping
  // - Camera state tracking (which blocks are visible)
  // - Integration with spatial indexing for visibility queries
});
