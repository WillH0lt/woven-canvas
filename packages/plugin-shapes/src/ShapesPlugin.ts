import {
  EditorComponentDef,
  Text,
  VerticalAlign,
  type EditorPlugin,
  type EditorPluginFactory,
} from "@infinitecanvas/editor";

import * as components from "./components";

const PLUGIN_NAME = "shapes";

/**
 * Options for configuring the Shapes plugin.
 */
export interface ShapesPluginOptions {
  // Reserved for future options
}

/**
 * Create a Shapes plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createShapesPlugin();
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createShapesPlugin(
  options: ShapesPluginOptions = {}
): EditorPlugin<ShapesPluginOptions> {
  return {
    name: PLUGIN_NAME,

    components: Object.values(components).filter(
      (v) => v instanceof EditorComponentDef
    ),

    blockDefs: [
      {
        tag: "shape",
        resizeMode: "free",
        components: [components.Shape, Text, VerticalAlign],
        editOptions: {
          canEdit: true,
        },
      },
    ],

    resources: options,
  };
}

/**
 * Shapes Plugin
 *
 * Provides SVG polygon shapes for infinite canvas:
 * - Various shape types (rectangle, ellipse, triangle, star, heart, etc.)
 * - Customizable fill color
 * - Customizable stroke color and width
 * - Support for text content inside shapes
 *
 * Can be used with or without options:
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { ShapesPlugin } from '@infinitecanvas/plugin-shapes';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [ShapesPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [ShapesPlugin({})],
 * });
 * ```
 */
export const ShapesPlugin: EditorPluginFactory<ShapesPluginOptions> = (
  options = {}
) => createShapesPlugin(options);
