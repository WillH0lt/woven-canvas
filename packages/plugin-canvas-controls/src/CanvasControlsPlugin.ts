import type { EditorPlugin, EditorPluginFactory } from '@woven-canvas/core'

import { PanState, PinchState } from './components'
import { PostInputPan, PostInputPinch, PostInputScroll, PostInputZoom } from './systems'
import { type CanvasControlsOptions, type CanvasControlsOptionsInput, CanvasControlsOptionsSchema } from './types'

/**
 * Create a controls plugin with the given options.
 */
function createControlsPlugin(options: CanvasControlsOptionsInput = {}): EditorPlugin<CanvasControlsOptions> {
  return {
    name: 'controls',

    resources: CanvasControlsOptionsSchema.parse(options),

    singletons: [PanState, PinchState],

    systems: [PostInputZoom, PostInputScroll, PostInputPan, PostInputPinch],
  }
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
 * import { Editor } from '@woven-canvas/core';
 * import { CanvasControlsPlugin } from '@woven-canvas/plugin-canvas-controls';
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
export const CanvasControlsPlugin: EditorPluginFactory<CanvasControlsOptionsInput, CanvasControlsOptions> = (
  options = {},
) => createControlsPlugin(options)
