import {
  CanvasComponentDef,
  CanvasSingletonDef,
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorSystem,
} from '@woven-canvas/core'

import * as components from './components'
import { PLUGIN_NAME } from './constants'
import * as singletons from './singletons'
import * as systems from './systems'

// Helper to filter EditorSystem instances from a namespace
const filterSystems = (ns: object): EditorSystem[] =>
  Object.values(ns).filter(
    (v): v is EditorSystem => typeof v === 'object' && v !== null && '_system' in v && 'phase' in v,
  )

/**
 * Options for configuring the Eraser plugin.
 */
export interface EraserPluginOptions {
  /**
   * Radius of the eraser stroke in world coordinates.
   * Larger values create a bigger eraser area.
   * @default 8
   */
  strokeRadius?: number
}

/**
 * Create an Eraser plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createEraserPlugin({
 *   strokeRadius: 16, // Larger eraser
 * });
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createEraserPlugin(options: EraserPluginOptions = {}): EditorPlugin<EraserPluginOptions> {
  return {
    name: PLUGIN_NAME,

    components: Object.values(components).filter((v) => v instanceof CanvasComponentDef),

    singletons: Object.values(singletons).filter((v) => v instanceof CanvasSingletonDef),

    blockDefs: [
      {
        tag: 'eraser-stroke',
        stratum: 'overlay',
        canRotate: false,
        canScale: false,
        components: [components.EraserStroke],
      },
    ],

    systems: filterSystems(systems),

    resources: {
      strokeRadius: options.strokeRadius ?? 8,
    },
  }
}

/**
 * Eraser Plugin
 *
 * Provides eraser tool functionality for infinite canvas:
 * - Draw strokes to mark objects for deletion
 * - Capsule-based collision detection for precise erasing
 * - Support for HitGeometry component for detailed hit testing
 * - Cancel to restore marked objects
 *
 * Can be used with or without options:
 *
 * @example
 * ```typescript
 * import { Editor } from '@woven-canvas/core';
 * import { EraserPlugin } from '@woven-canvas/plugin-eraser';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [EraserPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [EraserPlugin({
 *     strokeRadius: 16,
 *   })],
 * });
 * ```
 */
export const EraserPlugin: EditorPluginFactory<EraserPluginOptions> = (options = {}) => createEraserPlugin(options)
