/**
 * @infinitecanvas/plugin-canvas-controls
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
 * import { Editor, CorePlugin } from '@infinitecanvas/core';
 * import { CanvasControlsPlugin } from '@infinitecanvas/plugin-canvas-controls';
 *
 * const editor = new Editor({
 *   domElement: document.getElementById('canvas'),
 *   plugins: [
 *     CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
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
export { CanvasControlsPlugin } from './CanvasControlsPlugin'
// Components (for advanced use cases)
export { PanState } from './components'
// Types
export {
  type CanvasControlsOptions,
  type CanvasControlsOptionsInput,
  CanvasControlsOptionsSchema,
  DEFAULT_CONTROLS_OPTIONS,
  PanStateValue,
} from './types'
