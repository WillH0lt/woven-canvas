import {
  type EditorPlugin,
  type EditorPluginFactory,
} from "@infinitecanvas/editor";

import { PanState } from "./components";
import { PostInputZoom, PostInputScroll, PostInputPan } from "./systems";
import { DEFAULT_CONTROLS_OPTIONS, type CanvasControlsOptions } from "./types";

/**
 * Create a controls plugin with the given options.
 */
function createControlsPlugin(
  options: Partial<CanvasControlsOptions> = {}
): EditorPlugin<CanvasControlsOptions> {
  return {
    name: "controls",

    resources: {
      ...DEFAULT_CONTROLS_OPTIONS,
      ...options,
    },

    singletons: [PanState],

    systems: [PostInputZoom, PostInputScroll, PostInputPan],
  };
}

/**
 * Controls plugin for infinite canvas applications.
 *
 * The controls plugin handles:
 * - **Zoom**: Scroll wheel with modifier key (Ctrl/Cmd) to zoom in/out
 * - **Scroll**: Scroll wheel without modifier to pan the canvas
 * - **Pan**: Middle mouse button drag to pan the canvas
 *
 * Can be used with or without options:
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { CanvasControlsPlugin } from '@infinitecanvas/plugin-canvas-controls';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [CanvasControlsPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 })],
 * });
 * ```
 */
export const CanvasControlsPlugin: EditorPluginFactory<
  Partial<CanvasControlsOptions>,
  CanvasControlsOptions
> = (options = {}) => createControlsPlugin(options);
