import { type EditorPlugin } from "@infinitecanvas/editor";

import { PanState } from "./components";
import {
  captureZoomSystem,
  captureScrollSystem,
  capturePanSystem,
} from "./systems";
import { DEFAULT_CONTROLS_OPTIONS, type ControlsOptions } from "./types";

/**
 * Create a controls plugin with the given options.
 *
 * The controls plugin handles:
 * - **Zoom**: Scroll wheel with modifier key (Ctrl/Cmd) to zoom in/out
 * - **Scroll**: Scroll wheel without modifier to pan the canvas
 * - **Pan**: Middle mouse button drag to pan the canvas
 *
 * @param options - Optional configuration for zoom limits
 * @returns EditorPlugin instance
 *
 * @example
 * ```typescript
 * import { Editor, CorePlugin } from '@infinitecanvas/editor';
 * import { ControlsPlugin } from '@infinitecanvas/plugin-controls';
 *
 * const editor = new Editor({
 *   domElement: document.getElementById('canvas'),
 *   plugins: [
 *     ControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
 *   ],
 * });
 * ```
 */
export function ControlsPlugin(
  options: Partial<ControlsOptions> = {}
): EditorPlugin<ControlsOptions> {
  return {
    name: "controls",

    resources: {
      ...DEFAULT_CONTROLS_OPTIONS,
      ...options,
    },

    singletons: [PanState],

    captureSystems: [captureZoomSystem, captureScrollSystem, capturePanSystem],
  };
}
