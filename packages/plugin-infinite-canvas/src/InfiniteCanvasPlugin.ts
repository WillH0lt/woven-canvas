import {
  createEntity,
  addComponent,
  Synced,
  EditorComponentDef,
  EditorSingletonDef,
  MainThreadSystem,
  type EditorPlugin,
  type EditorPluginFactory,
} from "@infinitecanvas/editor";

import * as components from "./components";
import * as singletons from "./singletons";
import * as systems from "./systems";

import { DEFAULT_KEYBINDS, PLUGIN_NAME } from "./constants";
import {
  Keybind,
  InfiniteCanvasPluginOptionsSchema,
  type BlockDefMap,
  type CursorDefMap,
  type InfiniteCanvasPluginOptionsInput,
} from "./types";
import { DEFAULT_CURSOR_DEFS } from "./cursors";

// Helper to filter systems from a phase namespace
const filterSystems = (ns: object): MainThreadSystem[] =>
  Object.values(ns).filter(
    (v): v is MainThreadSystem => v instanceof MainThreadSystem
  );

/**
 * Resources for the Infinite Canvas plugin.
 * Access via getPluginResources<InfiniteCanvasResources>(ctx, PLUGIN_NAME).
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

  // Merge user keybinds with defaults (user keybinds override by key combination)
  const getKeybindKey = (kb: Keybind) =>
    `${kb.key}:${kb.mod ?? false}:${kb.shift ?? false}`;
  const defaultKeybinds = DEFAULT_KEYBINDS.map((kb) => Keybind.parse(kb));
  const userKeybinds = options.keybinds ?? [];
  const userKeybindKeys = new Set(userKeybinds.map(getKeybindKey));
  const keybinds = [
    ...defaultKeybinds.filter((kb) => !userKeybindKeys.has(getKeybindKey(kb))),
    ...userKeybinds,
  ];

  // Merge user cursors with defaults (user cursors override by kind)
  const cursors: CursorDefMap = {
    ...DEFAULT_CURSOR_DEFS,
    ...options.cursors,
  };

  return {
    name: PLUGIN_NAME,

    resources: {
      sessionId,
      userId,
      blockDefs,
      keybinds,
      cursors,
    },

    components: Object.values(components).filter(
      (v): v is EditorComponentDef<any> => v instanceof EditorComponentDef
    ),

    singletons: Object.values(singletons).filter(
      (v): v is EditorSingletonDef<any> => v instanceof EditorSingletonDef
    ),

    preInputSystems: filterSystems(systems.preInput),

    preCaptureSystems: filterSystems(systems.preCapture),

    captureSystems: filterSystems(systems.capture),

    updateSystems: filterSystems(systems.update),

    postUpdateSystems: filterSystems(systems.postUpdate),

    preRenderSystems: filterSystems(systems.preRender),

    postRenderSystems: filterSystems(systems.postRender),

    setup(ctx) {
      // Create the user entity for presence tracking
      const userEntity = createEntity(ctx);
      addComponent(ctx, userEntity, Synced, {
        id: sessionId,
      });
      addComponent(ctx, userEntity, components.User, {
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
