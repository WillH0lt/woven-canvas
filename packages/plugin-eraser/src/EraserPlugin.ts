import {
  CanvasComponentDef,
  CanvasSingletonDef,
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorSystem,
} from '@woven-canvas/core'
import { z } from 'zod'

import * as components from './components'
import { PLUGIN_NAME, POINTS_CAPACITY } from './constants'
import * as singletons from './singletons'
import * as systems from './systems'

// Helper to filter EditorSystem instances from a namespace
const filterSystems = (ns: object): EditorSystem[] =>
  Object.values(ns).filter(
    (v): v is EditorSystem => typeof v === 'object' && v !== null && '_system' in v && 'phase' in v,
  )

/**
 * Zod schema for validating EraserPluginOptions.
 */
export const EraserPluginOptionsSchema = z.object({
  tailRadius: z.number().positive().optional(),
  tailLength: z.number().int().min(1).max(POINTS_CAPACITY).optional(),
})

/**
 * Options for configuring the Eraser plugin.
 */
export type EraserPluginOptions = z.infer<typeof EraserPluginOptionsSchema>

/**
 * Create an Eraser plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createEraserPlugin({
 *   tailRadius: 16, // Larger eraser
 * });
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createEraserPlugin(options: EraserPluginOptions = {}): EditorPlugin<EraserPluginOptions> {
  const parsedOptions = EraserPluginOptionsSchema.parse(options)

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
      tailRadius: parsedOptions.tailRadius ?? 8,
      tailLength: parsedOptions.tailLength ?? POINTS_CAPACITY,
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
 *     tailRadius: 16,
 *   })],
 * });
 * ```
 */
export const EraserPlugin: EditorPluginFactory<EraserPluginOptions> = (options = {}) => createEraserPlugin(options)
