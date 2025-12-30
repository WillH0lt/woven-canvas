import {
  createEntity,
  addComponent,
  Synced,
  type EditorPlugin,
  type EditorPluginFactory,
} from "@infinitecanvas/editor";

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
  User,
} from "./components";

// Singletons
import {
  SelectionStateSingleton,
  TransformBoxStateSingleton,
  Intersect,
  RankBounds,
  Cursor,
  Clipboard,
  ScaleWithZoomState,
} from "./singletons";

import {
  PreInputRankBounds,
  PreCaptureIntersect,
  PreCaptureSelect,
  UpdateSelect,
  CaptureTransformBox,
  CaptureKeyboard,
  CaptureHoverCursor,
  PostUpdateTransformBox,
  PreRenderScaleWithZoom,
  PostRenderCursor,
  UpdateBlock,
  UpdateDragHandler,
} from "./systems";

import { DEFAULT_KEYBINDS } from "./constants";
import {
  Keybind,
  InfiniteCanvasPluginOptionsSchema,
  type BlockDefMap,
  type CursorDefMap,
  type InfiniteCanvasPluginOptionsInput,
} from "./types";
import { DEFAULT_CURSOR_DEFS } from "./cursors";

/**
 * Resources for the Infinite Canvas plugin.
 * Access via getPluginResources<InfiniteCanvasResources>(ctx, "infiniteCanvas").
 */
export interface InfiniteCanvasResources {
  sessionId: string;
  userId: string;
  blockDefs: BlockDefMap;
  keybinds: Keybind[];
  cursors: CursorDefMap;
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
  optionsInput: InfiniteCanvasPluginOptionsInput = {}
): EditorPlugin<InfiniteCanvasResources> {
  // Generate a unique session ID for this editor instance
  const sessionId = crypto.randomUUID();

  // Parse options with Zod schema
  const options = InfiniteCanvasPluginOptionsSchema.parse(optionsInput);

  // Generate user id if not provided
  const userId = options.userId ?? crypto.randomUUID();

  // Build normalized block definitions map
  const blockDefs: BlockDefMap = {};
  for (const def of options.customBlocks) {
    blockDefs[def.tag] = def;
  }

  // Use provided keybinds or defaults
  const keybinds =
    options.keybinds !== undefined
      ? options.keybinds
      : DEFAULT_KEYBINDS.map((kb) => Keybind.parse(kb));

  // Merge user cursors with defaults
  const cursors: CursorDefMap = {
    ...DEFAULT_CURSOR_DEFS,
    ...optionsInput.cursors,
  };

  return {
    name: "infiniteCanvas",

    dependencies: ["core"],

    resources: {
      sessionId,
      userId,
      blockDefs,
      keybinds,
      cursors,
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
      User,
    ],

    singletons: [
      SelectionStateSingleton,
      TransformBoxStateSingleton,
      Intersect,
      RankBounds,
      Cursor,
      Clipboard,
      ScaleWithZoomState,
    ],

    preInputSystems: [PreInputRankBounds],

    preCaptureSystems: [PreCaptureIntersect, PreCaptureSelect],

    captureSystems: [CaptureTransformBox, CaptureKeyboard, CaptureHoverCursor],

    updateSystems: [UpdateBlock, UpdateSelect, UpdateDragHandler],

    postUpdateSystems: [PostUpdateTransformBox],

    preRenderSystems: [PreRenderScaleWithZoom],

    postRenderSystems: [PostRenderCursor],

    setup(ctx) {
      // Create the user entity for presence tracking
      const userEntity = createEntity(ctx);
      addComponent(ctx, userEntity, Synced, {
        id: sessionId,
      });
      addComponent(ctx, userEntity, User, {
        id: userId,
      });
    },
  };
}

/**
 * Infinite Canvas Plugin
 *
 * Provides core infinite canvas functionality:
 * - Block management (create, select, move, resize, rotate)
 * - Selection (single, multi-select, marquee selection)
 * - Transform box (scale, stretch, rotate handles)
 * - Z-ordering (bring forward, send backward)
 * - Connectors (lines/arrows between blocks)
 *
 * Can be used with or without options:
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { InfiniteCanvasPlugin } from '@infinitecanvas/plugin-infinite-canvas';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [InfiniteCanvasPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [InfiniteCanvasPlugin({
 *     customBlocks: [{ tag: "text", resizeMode: "text" }],
 *   })],
 * });
 * ```
 */
export const InfiniteCanvasPlugin: EditorPluginFactory<
  InfiniteCanvasPluginOptionsInput,
  InfiniteCanvasResources
> = (options = {}) => createInfiniteCanvasPlugin(options);
