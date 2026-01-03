import type { Context, System } from "@infinitecanvas/ecs";

import type { AnyEditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef as EditorSingletonDef } from "./EditorSingletonDef";
import type { BlockDefMap, Keybind } from "./types";

/**
 * Systems organized by execution phase.
 *
 * Phases execute in order:
 * 1. **preInput** - Before input phase
 * 2. **input** - Convert raw DOM events to ECS state
 * 3. **postInput** - After input phase
 * 4. **preCapture** - Before capture phase
 * 5. **capture** - Detect targets and compute intersections
 * 6. **postCapture** - After capture phase
 * 7. **preUpdate** - Before update phase
 * 8. **update** - Modify document state and process commands
 * 9. **postUpdate** - After update phase
 * 10. **preRender** - Before render phase
 * 11. **render** - Sync ECS state to output
 * 12. **postRender** - After render phase
 */
export interface PluginSystems {
  /** Systems that run before input phase */
  preInputSystems?: System[];
  /** Systems that convert raw DOM events to ECS state */
  inputSystems?: System[];
  /** Systems that run after input phase */
  postInputSystems?: System[];
  /** Systems that run before capture phase */
  preCaptureSystems?: System[];
  /** Systems that detect targets and compute intersections */
  captureSystems?: System[];
  /** Systems that run after capture phase */
  postCaptureSystems?: System[];
  /** Systems that run before update phase */
  preUpdateSystems?: System[];
  /** Systems that modify document state and process commands */
  updateSystems?: System[];
  /** Systems that run after update phase */
  postUpdateSystems?: System[];
  /** Systems that run before render phase */
  preRenderSystems?: System[];
  /** Systems that sync ECS state to output */
  renderSystems?: System[];
  /** Systems that run after render phase */
  postRenderSystems?: System[];
}

/**
 * Editor plugin interface.
 *
 * Plugins extend the editor with:
 * - Components (EditorComponentDef instances)
 * - Singletons (EditorSingletonDef instances)
 * - Systems (behavior in specific phases)
 * - Commands (user actions)
 *
 * @example
 * ```typescript
 * import { EditorPlugin, defineEditorComponent, defineEditorSingleton, field } from '@infinitecanvas/editor';
 *
 * const Selected = defineEditorComponent('selected', {}, { sync: 'ephemeral' });
 *
 * const Hovered = defineEditorComponent('hovered', {}, { sync: 'none' });
 *
 * const CameraState = defineEditorSingleton('camera', {
 *   x: field.float64().default(0),
 *   y: field.float64().default(0),
 *   zoom: field.float64().default(1),
 * }, { sync: 'ephemeral' });
 *
 * const SelectionPlugin: EditorPlugin = {
 *   name: 'selection',
 *
 *   components: [Selected, Hovered],
 *   singletons: [CameraState],
 *
 *   captureSystems: [
 *     (ctx) => {
 *       // Detect hover state
 *     },
 *     (ctx) => {
 *       // Handle selection logic
 *     },
 *   ],
 *
 *   commands: [
 *     {
 *       type: 'selection:select-all',
 *       execute: (ctx, payload) => {
 *         // Select all blocks
 *       }
 *     }
 *   ],
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

  /** Block definitions provided by the plugin */
  blockDefs?: BlockDefMap;

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
   * User-defined components should use defineEditorComponent() with an `id` field.
   * Internal components may use base ComponentDef.
   */
  components?: AnyEditorComponentDef[];

  /**
   * Singletons to register.
   * Create with new EditorSingletonDef(schema, options).
   */
  singletons?: EditorSingletonDef[];

  /** Systems that run before input phase */
  preInputSystems?: System[];

  /** Systems that convert raw DOM events to ECS state */
  inputSystems?: System[];

  /** Systems that run after input phase */
  postInputSystems?: System[];

  /** Systems that run before capture phase */
  preCaptureSystems?: System[];

  /** Systems that detect targets and compute intersections */
  captureSystems?: System[];

  /** Systems that run after capture phase */
  postCaptureSystems?: System[];

  /** Systems that run before update phase */
  preUpdateSystems?: System[];

  /** Systems that modify document state and process commands */
  updateSystems?: System[];

  /** Systems that run after update phase */
  postUpdateSystems?: System[];

  /** Systems that run before render phase */
  preRenderSystems?: System[];

  /** Systems that sync ECS state to output */
  renderSystems?: System[];

  /** Systems that run after render phase */
  postRenderSystems?: System[];

  /**
   * Commands to register.
   * Each command has a type string and an execute function.
   */
  commands?: Array<{
    type: string;
    execute: (ctx: Context, payload?: unknown) => void;
  }>;

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
  options: TOptions
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
  plugins: EditorPlugin[]
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
          `Plugin "${plugin.name}" depends on "${depName}" which is not registered`
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
