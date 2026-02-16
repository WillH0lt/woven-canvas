import {
  type AnyCanvasComponentDef,
  type AnyCanvasSingletonDef,
} from "@woven-ecs/canvas-store";
import type { Context } from "@woven-ecs/core";
import type { EditorSystem } from "./EditorSystem";
import type { CursorDef, Keybind, BlockDefInput } from "./types";
import type { FontFamilyInput } from "./FontLoader";

/**
 * Editor plugin interface.
 *
 * Plugins extend the editor with:
 * - Components (CanvasComponentDef instances)
 * - Singletons (CanvasSingletonDef instances)
 * - Systems (behavior in specific phases with priority)
 * - Commands (user actions)
 *
 * @example
 * ```typescript
 * import {
 *   EditorPlugin,
 *   defineCanvasComponent,
 *   defineCanvasSingleton,
 *   defineEditorSystem,
 *   field,
 * } from '@infinitecanvas/core';
 *
 * const Selected = defineCanvasComponent('selected', {}, { sync: 'ephemeral' });
 * const Hovered = defineCanvasComponent('hovered', {}, { sync: 'none' });
 *
 * const CameraState = defineCanvasSingleton('camera', {
 *   x: field.float64().default(0),
 *   y: field.float64().default(0),
 *   zoom: field.float64().default(1),
 * }, { sync: 'ephemeral' });
 *
 * const hoverSystem = defineEditorSystem(
 *   { phase: 'capture' },
 *   (ctx) => {
 *     // Detect hover state
 *   }
 * );
 *
 * const selectionSystem = defineEditorSystem(
 *   { phase: 'capture', priority: -10 }, // Runs after hoverSystem
 *   (ctx) => {
 *     // Handle selection logic
 *   }
 * );
 *
 * const SelectionPlugin: EditorPlugin = {
 *   name: 'selection',
 *   components: [Selected, Hovered],
 *   singletons: [CameraState],
 *   systems: [hoverSystem, selectionSystem],
 *
 *   setup(ctx) {
 *     console.log('Selection plugin initialized');
 *   },
 *
 *   teardown(ctx) {
 *     console.log('Selection plugin destroyed');
 *   }
 * };
 * ```
 */
export interface EditorPlugin<TResources = unknown> {
  /** Unique plugin identifier */
  name: string;

  /** Keybindings provided by the plugin */
  keybinds?: Keybind[];

  /** Block definitions provided by the plugin (keyed by tag) */
  blockDefs?: BlockDefInput[];

  cursors?: Record<string, CursorDef>;

  /**
   * Font families provided by the plugin.
   * Fonts will be loaded automatically during editor initialization.
   */
  fonts?: FontFamilyInput[];

  /**
   * Plugin-specific resources/options.
   * Access in systems via getPluginResources<T>(ctx, pluginName).
   */
  resources?: TResources;

  /**
   * Names of plugins this one depends on.
   * Dependencies are loaded before this plugin.
   */
  dependencies?: string[];

  /**
   * Components to register.
   * User-defined components should use defineCanvasComponent() with an `id` field.
   * Internal components may use base ComponentDef.
   */
  components?: AnyCanvasComponentDef[];

  /**
   * Singletons to register.
   * Create with new CanvasSingletonDef(schema, options).
   */
  singletons?: AnyCanvasSingletonDef[];

  /**
   * Systems to register.
   * Each system specifies its phase and priority.
   * Use defineEditorSystem() to create systems.
   */
  systems?: EditorSystem[];

  /**
   * Called when the plugin is initialized.
   * Use this for one-time setup like adding event listeners.
   */
  setup?: (ctx: Context) => void | Promise<void>;

  /**
   * Called when the editor is destroyed.
   * Use this to clean up resources.
   */
  teardown?: (ctx: Context) => void;
}

/**
 * A plugin factory function that returns a plugin when called.
 * Allows passing configuration options to plugins.
 *
 * @example
 * ```typescript
 * // Define a plugin factory
 * export const CanvasControlsPlugin = (options: ControlsOptions = {}) => ({
 *   name: "controls",
 *   resources: { zoomSpeed: options.zoomSpeed ?? 1.0 },
 *   // ... systems, components, etc.
 * });
 *
 * // Use with default options
 * const editor = new Editor(el, { plugins: [CanvasControlsPlugin] });
 *
 * // Or with custom options
 * const editor = new Editor(el, { plugins: [CanvasControlsPlugin({ zoomSpeed: 2.0 })] });
 * ```
 */
export type EditorPluginFactory<TOptions = unknown, TResources = unknown> = (
  options: TOptions,
) => EditorPlugin<TResources>;

/**
 * Input type for plugin configuration.
 * Accepts either a plugin object directly or a factory function.
 */
export type EditorPluginInput = EditorPlugin | EditorPluginFactory<any, any>;

/**
 * Parse a plugin input into a plugin object.
 * If the input is a factory function, it's called with empty options.
 *
 * @param input - Either a plugin object or factory function
 * @returns The resolved plugin object
 */
export function parsePlugin(input: EditorPluginInput): EditorPlugin {
  if (typeof input === "function") {
    return input({});
  }
  return input;
}

/**
 * Sort plugins by dependencies (topological sort)
 * @internal
 */
export function sortPluginsByDependencies(
  plugins: EditorPlugin[],
): EditorPlugin[] {
  const sorted: EditorPlugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const pluginMap = new Map(plugins.map((p) => [p.name, p]));

  function visit(plugin: EditorPlugin): void {
    if (visited.has(plugin.name)) return;
    if (visiting.has(plugin.name)) {
      throw new Error(`Circular plugin dependency detected: ${plugin.name}`);
    }

    visiting.add(plugin.name);

    for (const depName of plugin.dependencies ?? []) {
      const dep = pluginMap.get(depName);
      if (!dep) {
        throw new Error(
          `Plugin "${plugin.name}" depends on "${depName}" which is not registered`,
        );
      }
      visit(dep);
    }

    visiting.delete(plugin.name);
    visited.add(plugin.name);
    sorted.push(plugin);
  }

  for (const plugin of plugins) {
    visit(plugin);
  }

  return sorted;
}
