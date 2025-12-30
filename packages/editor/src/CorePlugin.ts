import {
  createEntity,
  addComponent,
  getResources,
  MainThreadSystem,
} from "@infinitecanvas/ecs";

import type { EditorPlugin, EditorPluginFactory } from "./plugin";
import type { EditorResources } from "./types";
import { EditorComponentDef } from "./EditorComponentDef";
import { EditorSingletonDef } from "./EditorSingletonDef";
import {
  attachKeyboardListeners,
  detachKeyboardListeners,
  attachMouseListeners,
  detachMouseListeners,
  attachScreenObserver,
  detachScreenObserver,
  attachPointerListeners,
  detachPointerListeners,
} from "./systems/input";

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
  type InfiniteCanvasResources,
} from "./types";
import { DEFAULT_CURSOR_DEFS } from "./cursors";

// Helper to filter systems from a phase namespace
const filterSystems = (ns: object): MainThreadSystem[] =>
  Object.values(ns).filter(
    (v): v is MainThreadSystem => v instanceof MainThreadSystem
  );

/**
 * Create the Core plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createCorePlugin({
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
export function createCorePlugin(
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

    inputSystems: filterSystems(systems.input),

    preCaptureSystems: filterSystems(systems.preCapture),

    captureSystems: filterSystems(systems.capture),

    updateSystems: filterSystems(systems.update),

    postUpdateSystems: filterSystems(systems.postUpdate),

    preRenderSystems: filterSystems(systems.preRender),

    postRenderSystems: filterSystems(systems.postRender),

    setup(ctx) {
      const { domElement } = getResources<EditorResources>(ctx);

      // Attach all event listeners
      attachKeyboardListeners(domElement);
      attachMouseListeners(domElement);
      attachScreenObserver(domElement);
      attachPointerListeners(domElement);

      // Create the user entity for presence tracking
      const userEntity = createEntity(ctx);
      addComponent(ctx, userEntity, components.Synced, {
        id: sessionId,
      });
      addComponent(ctx, userEntity, components.User, {
        id: userId,
      });
    },

    teardown(ctx) {
      const { domElement } = getResources<EditorResources>(ctx);

      // Detach all event listeners
      detachKeyboardListeners(domElement);
      detachMouseListeners(domElement);
      detachScreenObserver(domElement);
      detachPointerListeners(domElement);
    },
  };
}

/**
 * Core Plugin
 *
 * Provides core editor functionality:
 * - Input handling (keyboard, mouse, pointer, screen)
 * - Camera management (pan, zoom)
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
 * import { Editor, CorePlugin } from '@infinitecanvas/editor';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [CorePlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [CorePlugin({
 *     customBlocks: [{ tag: "text", resizeMode: "text" }],
 *   })],
 * });
 * ```
 */
export const CorePlugin: EditorPluginFactory<
  InfiniteCanvasPluginOptionsInput,
  InfiniteCanvasResources
> = (options = {}) => createCorePlugin(options);
