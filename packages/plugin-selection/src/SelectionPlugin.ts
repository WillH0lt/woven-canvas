import {
  CanvasComponentDef,
  CanvasSingletonDef,
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
import {
  SelectionPluginOptionsSchema,
  type SelectionPluginOptions,
  type SelectionPluginOptionsInput,
} from "./types";


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
 *   edgeScrolling: {
 *     enabled: true,
 *     edgeSizePx: 10,
 *     edgeScrollSpeedPxPerFrame: 15,
 *     edgeScrollDelayMs: 250,
 *   },
 * });
 *
 * const editor = new Editor(container, { plugins: [plugin] });
 * ```
 */
export function createSelectionPlugin(
  options: SelectionPluginOptionsInput = {}
): EditorPlugin<SelectionPluginOptions> {
  return {
    name: PLUGIN_NAME,

    resources: SelectionPluginOptionsSchema.parse(options),

    components: Object.values(components).filter(
      (v) => v instanceof CanvasComponentDef
    ),

    singletons: Object.values(singletons).filter(
      (v) => v instanceof CanvasSingletonDef
    ),

    blockDefs: [
      {
        tag: "selection-box",
        stratum: "overlay",
        canRotate: false,
        canScale: false,
        components: [components.SelectionBox]
      },
      {
        tag: "transform-box",
        stratum: "overlay",
        canRotate: false,
        canScale: false,
        components: [components.TransformBox]
      },
      {
        tag: "transform-handle",
        stratum: "overlay",
        canRotate: false,
        canScale: false,
        components: [components.TransformHandle]
      },
      {
        tag: "transform-edge",
        stratum: "overlay",
        canRotate: false,
        canScale: false,
        components: [components.TransformHandle]
      },
      {
        tag: "transform-rotate",
        stratum: "overlay",
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
 * Selection Plugin
 *
 * Provides core selection functionality:
 * - Block management (create, select, move, resize, rotate)
 * - Selection (single, multi-select, marquee selection)
 * - Transform box (scale, stretch, rotate handles)
 * - Z-ordering (bring forward, send backward)
 * - Edge scrolling (auto-scroll when dragging near viewport edges)
 *
 * Can be used with or without options:
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { SelectionPlugin } from '@infinitecanvas/plugin-selection';
 *
 * // With default options
 * const editor = new Editor(el, {
 *   plugins: [SelectionPlugin()],
 * });
 *
 * // With custom options
 * const editor = new Editor(el, {
 *   plugins: [SelectionPlugin({
 *     edgeScrolling: {
 *       enabled: true,
 *       edgeSizePx: 20,
 *     },
 *   })],
 * });
 * ```
 */
export const SelectionPlugin: EditorPluginFactory<
  SelectionPluginOptionsInput,
  SelectionPluginOptions
> = (options = {}) => createSelectionPlugin(options);
