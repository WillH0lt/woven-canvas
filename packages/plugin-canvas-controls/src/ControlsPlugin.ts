import {
  type EditorPlugin,
  type EditorPluginFactory,
} from "@infinitecanvas/editor";

import { PanState } from "./components";
import { PostInputZoom, PostInputScroll, PostInputPan } from "./systems";
import { DEFAULT_CONTROLS_OPTIONS, type ControlsOptions } from "./types";

/**
 * Create a controls plugin with the given options.
 */
function createControlsPlugin(
  options: Partial<ControlsOptions> = {}
): EditorPlugin<ControlsOptions> {
  return {
    name: "controls",

    resources: {
      ...DEFAULT_CONTROLS_OPTIONS,
      ...options,
    },

    singletons: [PanState],

    postInputSystems: [PostInputZoom, PostInputScroll, PostInputPan],
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
 * import { ControlsPlugin } from '@infinitecanvas/plugin-controls';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [ControlsPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [ControlsPlugin({ minZoom: 0.1, maxZoom: 10 })],
 * });
 * ```
 */
export const ControlsPlugin: EditorPluginFactory<
  Partial<ControlsOptions>,
  ControlsOptions
> = (options = {}) => createControlsPlugin(options);
