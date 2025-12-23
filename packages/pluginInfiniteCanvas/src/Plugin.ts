import type { EditorPlugin } from "@infinitecanvas/editor";

// Components
import {
  Block,
  Aabb,
  Selected,
  Hovered,
  Edited,
  Locked,
  DragStart,
  TransformBox,
  TransformHandle,
  SelectionBox,
  ScaleWithZoom,
  Opacity,
  Text,
  Connector,
} from "./components";

// Singletons
import {
  SelectionStateSingleton,
  TransformBoxStateSingleton,
  Intersect,
  RankBounds,
  Cursor,
} from "./singletons";

import {
  PreCaptureIntersect,
  PreCaptureSelect,
  UpdateSelect,
  CaptureTransformBox,
  UpdateTransformBox,
  UpdateBlock,
  UpdateDragHandler,
} from "./systems";

import { BlockDef, type BlockDefInput, type BlockDefMap } from "./types";

/**
 * Resources for the Infinite Canvas plugin.
 * Access via getPluginResources<InfiniteCanvasResources>(ctx, "infiniteCanvas").
 */
export interface InfiniteCanvasResources {
  blockDefs: BlockDefMap;
}

/**
 * Options for the Infinite Canvas plugin.
 */
export interface InfiniteCanvasPluginOptions {
  /**
   * Custom block definitions.
   * These define how different block types behave (editing, resizing, rotation, etc.)
   */
  customBlocks?: BlockDefInput[];
}

/**
 * Create an Infinite Canvas plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createInfiniteCanvasPlugin({
 *   customBlocks: [
 *     {
 *       tag: "text",
 *       editOptions: { canEdit: true, removeWhenTextEmpty: true },
 *       resizeMode: "text",
 *     },
 *     {
 *       tag: "image",
 *       resizeMode: "scale",
 *       canRotate: true,
 *     },
 *   ],
 * });
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createInfiniteCanvasPlugin(
  options: InfiniteCanvasPluginOptions = {}
): EditorPlugin<InfiniteCanvasResources> {
  const { customBlocks = [] } = options;

  // Build normalized block definitions map using Zod parsing
  const blockDefs: BlockDefMap = {};
  for (const def of customBlocks) {
    const parsed = BlockDef.parse(def);
    blockDefs[parsed.tag] = parsed;
  }

  return {
    name: "infiniteCanvas",

    dependencies: ["core"],

    resources: {
      blockDefs,
    },

    components: [
      Block,
      Aabb,
      Selected,
      Hovered,
      Edited,
      Locked,
      DragStart,
      TransformBox,
      TransformHandle,
      SelectionBox,
      ScaleWithZoom,
      Opacity,
      Text,
      Connector,
    ],

    singletons: [
      SelectionStateSingleton,
      TransformBoxStateSingleton,
      Intersect,
      RankBounds,
      Cursor,
    ],

    preCaptureSystems: [PreCaptureIntersect, PreCaptureSelect],

    captureSystems: [CaptureTransformBox],

    updateSystems: [
      UpdateBlock,
      UpdateSelect,
      UpdateTransformBox,
      UpdateDragHandler,
    ],
  };
}

/**
 * Infinite Canvas Plugin (default configuration)
 *
 * Provides core infinite canvas functionality:
 * - Block management (create, select, move, resize, rotate)
 * - Selection (single, multi-select, marquee selection)
 * - Transform box (scale, stretch, rotate handles)
 * - Z-ordering (bring forward, send backward)
 * - Connectors (lines/arrows between blocks)
 *
 * For custom block definitions, use `createInfiniteCanvasPlugin()` instead.
 */
export const InfiniteCanvasPlugin: EditorPlugin = createInfiniteCanvasPlugin();
