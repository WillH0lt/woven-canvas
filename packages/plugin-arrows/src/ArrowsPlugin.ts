import {
  EditorComponentDef,
  EditorSingletonDef,
  type EditorPlugin,
  type EditorPluginFactory,
} from "@infinitecanvas/editor";

import * as components from "./components";
import * as singletons from "./singletons";
import {
  captureArrowDrawSystem,
  captureArrowTransformSystem,
  updateArrowTransformSystem,
  updateArrowHitGeometrySystem,
} from "./systems";
import { PLUGIN_NAME, ELBOW_ARROW_PADDING } from "./constants";

/**
 * Options for configuring the Arrows plugin.
 */
export interface ArrowsPluginOptions {
  /**
   * Padding around blocks when routing elbow arrows.
   * @default 50
   */
  elbowArrowPadding?: number;
}

/**
 * Create an Arrows plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createArrowsPlugin({
 *   elbowArrowPadding: 100, // Larger padding for arrow routing
 * });
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createArrowsPlugin(
  options: ArrowsPluginOptions = {}
): EditorPlugin<ArrowsPluginOptions> {
  return {
    name: PLUGIN_NAME,

    components: Object.values(components).filter(
      (v) => v instanceof EditorComponentDef
    ),

    singletons: Object.values(singletons).filter(
      (v) => v instanceof EditorSingletonDef
    ),

    blockDefs: [
      {
        tag: "arc-arrow",
        resizeMode: 'groupOnly',
        components: [components.ArcArrow],
      },
      {
        tag: "elbow-arrow",
        resizeMode: 'groupOnly',
        components: [components.ElbowArrow],
      },
      {
        tag: "arrow-handle",
        canRotate: false,
        canScale: false,
        components: [components.ArrowHandle],
      },
    ],

    systems: [
      captureArrowDrawSystem,
      captureArrowTransformSystem,
      updateArrowTransformSystem,
      updateArrowHitGeometrySystem,
    ],

    resources: {
      elbowArrowPadding: options.elbowArrowPadding ?? ELBOW_ARROW_PADDING,
    },
  };
}

/**
 * Arrows Plugin
 *
 * Provides arrow drawing and editing functionality for infinite canvas:
 * - Draw arc (curved) arrows with bezier-like control
 * - Draw elbow (orthogonal) arrows that route around obstacles
 * - Connect arrows to blocks with automatic endpoint tracking
 * - Transform handles for editing existing arrows
 * - Hit geometry for selection and interaction
 *
 * Can be used with or without options:
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { ArrowsPlugin } from '@infinitecanvas/plugin-arrows';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [ArrowsPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [ArrowsPlugin({
 *     elbowArrowPadding: 100,
 *   })],
 * });
 * ```
 */
export const ArrowsPlugin: EditorPluginFactory<ArrowsPluginOptions> = (
  options = {}
) => createArrowsPlugin(options);
