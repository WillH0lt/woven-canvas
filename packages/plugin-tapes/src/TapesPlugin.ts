import {
  Asset,
  CanvasComponentDef,
  CanvasSingletonDef,
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorSystem,
  Image,
  ResizeMode,
} from '@woven-canvas/core'

import * as components from './components'
import { TAPES_PLUGIN_NAME } from './constants'
import * as singletons from './singletons'
import * as systems from './systems'

// Helper to filter EditorSystem instances from a namespace
const filterSystems = (ns: object): EditorSystem[] =>
  Object.values(ns).filter(
    (v): v is EditorSystem => typeof v === 'object' && v !== null && '_system' in v && 'phase' in v,
  )

/**
 * Create a Tapes plugin.
 *
 * @returns Configured EditorPlugin
 */
export function createTapesPlugin(): EditorPlugin {
  return {
    name: TAPES_PLUGIN_NAME,

    dependencies: ['selection'],

    components: Object.values(components).filter((v) => v instanceof CanvasComponentDef),

    singletons: Object.values(singletons).filter((v) => v instanceof CanvasSingletonDef),

    blockDefs: [
      {
        tag: 'tape',
        components: [components.Tape, Image, Asset],
        resizeMode: ResizeMode.Scale,
        connectors: {
          enabled: false,
        },
      },
    ],

    systems: filterSystems(systems),
  }
}

/**
 * Tapes Plugin
 *
 * Provides washi tape drawing functionality for infinite canvas:
 * - Click and drag to draw tape across the canvas
 * - Tape stretches from start to end point with rotation
 * - Uses tiling tape texture images via Asset system
 * - RotateScale handles for repositioning tape endpoints
 *
 * @example
 * ```typescript
 * import { Editor } from '@woven-canvas/core';
 * import { TapesPlugin } from '@woven-canvas/plugin-tapes';
 *
 * const editor = new Editor(el, {
 *   plugins: [TapesPlugin],
 * });
 * ```
 */
export const TapesPlugin: EditorPluginFactory = () => createTapesPlugin()
