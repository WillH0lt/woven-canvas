/**
 * @infinitecanvas/plugin-controls
 *
 * Canvas controls plugin for infinite canvas applications.
 *
 * Provides pan, zoom, and scroll controls:
 * - **Zoom**: Scroll wheel + modifier key (Ctrl/Cmd) - zooms toward cursor
 * - **Scroll**: Scroll wheel without modifier - pans the canvas
 * - **Pan**: Middle mouse button drag - pans the canvas
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
 *
 * await editor.initialize();
 * editor.start();
 * ```
 *
 * @packageDocumentation
 */

// Plugin
export { ControlsPlugin } from "./ControlsPlugin";

// Types
export {
  type ControlsOptions,
  type ControlsResources,
  DEFAULT_CONTROLS_OPTIONS,
  PanStateValue,
} from "./types";

// Components (for advanced use cases)
export { PanState } from "./components";

// Systems (for advanced use cases)
export {
  captureZoomSystem,
  captureScrollSystem,
  capturePanSystem,
} from "./systems";
