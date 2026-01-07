import {
  EditorComponentDef,
  EditorSingletonDef,
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorSystem,
  Key,
} from "@infinitecanvas/editor";

import {
  RemoveSelected,
  SelectAll,
  BringForwardSelected,
  SendBackwardSelected,
  Cut,
  Copy,
  Paste,
} from "./commands";

import * as components from "./components";
import * as singletons from "./singletons";
import * as systems from "./systems";

import { PLUGIN_NAME } from "./constants";
import { CURSORS } from "./cursors";


// Helper to filter EditorSystem instances from a namespace
const filterSystems = (ns: object): EditorSystem[] =>
  Object.values(ns).filter(
    (v): v is EditorSystem =>
      typeof v === "object" && v !== null && "_system" in v && "phase" in v
  );

/**
 * Create an Infinite Canvas plugin with custom options.
 *
 * @param options - Plugin configuration options
 * @returns Configured EditorPlugin
 *
 * @example
 * ```typescript
 * const plugin = createSelectionPlugin({
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
export function createSelectionPlugin(): EditorPlugin {
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
        tag: "selection-box",
        canRotate: false,
        canScale: false,
        components: [components.SelectionBox]
      },
      {
        tag: "transform-box",
        canRotate: false,
        canScale: false,
        components: [components.TransformBox]
      },
      {
        tag: "transform-handle",
        canRotate: false,
        canScale: false,
        components: [components.TransformHandle]
      },
      {
        tag: "transform-edge",
        canRotate: false,
        canScale: false,
        components: [components.TransformHandle]
      },
      {
        tag: "transform-rotate",
        canRotate: false,
        canScale: false,
        components: [components.TransformHandle]
      },
    ],

    systems: [
      ...filterSystems(systems.preCapture),
      ...filterSystems(systems.capture),
      ...filterSystems(systems.update),
      ...filterSystems(systems.postUpdate),
    ],

    keybinds: [
      {
        command: Cut.name,
        key: Key.X,
        mod: true,
      },
      {
        command: Copy.name,
        key: Key.C,
        mod: true,
      },
      {
        command: Paste.name,
        key: Key.V,
        mod: true,
      },
      {
        command: RemoveSelected.name,
        key: Key.Delete,
      },
      {
        command: SelectAll.name,
        key: Key.A,
        mod: true,
      },
      {
        command: BringForwardSelected.name,
        key: Key.BracketRight,
      },
      {
        command: SendBackwardSelected.name,
        key: Key.BracketLeft,
      },
    ],

    cursors: CURSORS,
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
 * import { SelectionPlugin } from '@infinitecanvas/plugin-selection';
 *
 * // With default options (no parentheses needed)
 * const editor = new Editor(el, {
 *   plugins: [SelectionPlugin],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [SelectionPlugin({
 *     customBlocks: [{ tag: "text", resizeMode: "text" }],
 *   })],
 * });
 * ```
 */
export const SelectionPlugin: EditorPluginFactory = () =>
  createSelectionPlugin();
