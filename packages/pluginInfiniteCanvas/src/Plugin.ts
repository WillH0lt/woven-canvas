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
  Clipboard,
} from "./singletons";

import {
  PreInputRankBounds,
  PreCaptureIntersect,
  PreCaptureSelect,
  UpdateSelect,
  CaptureTransformBox,
  CaptureKeyboard,
  PostUpdateTransformBox,
  UpdateBlock,
  UpdateDragHandler,
} from "./systems";

import { DEFAULT_KEYBINDS } from "./constants";
import {
  BlockDef,
  Keybind,
  type BlockDefInput,
  type BlockDefMap,
  type KeybindInput,
} from "./types";

/**
 * Resources for the Infinite Canvas plugin.
 * Access via getPluginResources<InfiniteCanvasResources>(ctx, "infiniteCanvas").
 */
export interface InfiniteCanvasResources {
  blockDefs: BlockDefMap;
  keybinds: Keybind[];
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

  /**
   * Keybind definitions for keyboard shortcuts.
   * These map key combinations to plugin commands.
   * Defaults to DEFAULT_KEYBINDS if not specified.
   */
  keybinds?: KeybindInput[];
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
  const { customBlocks = [], keybinds: keybindsInput } = options;

  // Build normalized block definitions map using Zod parsing
  const blockDefs: BlockDefMap = {};
  for (const def of customBlocks) {
    const parsed = BlockDef.parse(def);
    blockDefs[parsed.tag] = parsed;
  }

  // Parse keybinds with defaults
  const keybinds =
    keybindsInput !== undefined
      ? keybindsInput.map((kb) => Keybind.parse(kb))
      : DEFAULT_KEYBINDS.map((kb) => Keybind.parse(kb));

  return {
    name: "infiniteCanvas",

    dependencies: ["core"],

    resources: {
      blockDefs,
      keybinds,
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
      Clipboard,
    ],

    preInputSystems: [PreInputRankBounds],

    preCaptureSystems: [PreCaptureIntersect, PreCaptureSelect],

    captureSystems: [CaptureTransformBox, CaptureKeyboard],

    updateSystems: [UpdateBlock, UpdateSelect, UpdateDragHandler],

    postUpdateSystems: [PostUpdateTransformBox],
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
