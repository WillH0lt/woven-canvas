import {
  CanvasComponentDef,
  CanvasSingletonDef,
  Color,
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorSystem,
  ResizeMode,
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
 * Create a Pen plugin.
 *
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createPenPlugin();
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createPenPlugin(): EditorPlugin {
  return {
    name: PLUGIN_NAME,

    components: Object.values(components).filter((v) => v instanceof CanvasComponentDef),

    singletons: Object.values(singletons).filter((v) => v instanceof CanvasSingletonDef),

    blockDefs: [
      {
        tag: 'pen-stroke',
        resizeMode: ResizeMode.Free,
        components: [components.PenStroke, Color],
        connectors: { enabled: false },
      },
    ],

    systems: filterSystems(systems),

    resources: {},
  }
}

/**
 * Pen Plugin
 *
 * Provides pen/ink drawing functionality for infinite canvas:
 * - Draw smooth SVG ink strokes with pressure sensitivity
 * - Strokes are scalable and rotatable
 * - Support for pen pressure when using stylus input
 * - Hit geometry generation for precise selection
 *
 * @example
 * ```typescript
 * import { Editor } from '@woven-canvas/core';
 * import { PenPlugin } from '@woven-canvas/plugin-pen';
 *
 * // Use the plugin
 * const editor = new Editor(el, {
 *   plugins: [PenPlugin],
 * });
 * ```
 */
export const PenPlugin: EditorPluginFactory = () => createPenPlugin()
