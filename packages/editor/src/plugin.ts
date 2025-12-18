import type {
  Context,
  System,
  ComponentDef,
  ComponentSchema,
} from "@infinitecanvas/ecs";

import type { AnyEditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef as EditorSingletonDef } from "./EditorSingletonDef";

/**
 * Systems organized by execution phase.
 *
 * Phases execute in order:
 * 1. **input** - Convert raw DOM events to ECS state
 * 2. **capture** - Detect targets and compute intersections
 * 3. **update** - Modify document state and process commands
 * 4. **render** - Sync ECS state to output
 */
export interface PluginSystems {
  /** Systems that convert raw DOM events to ECS state */
  inputSystems?: System[];
  /** Systems that detect targets and compute intersections */
  captureSystems?: System[];
  /** Systems that modify document state and process commands */
  updateSystems?: System[];
  /** Systems that sync ECS state to output */
  renderSystems?: System[];
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
 * const Selected = defineEditorComponent('selected', {}, { sync: 'presence' });
 *
 * const Hovered = defineEditorComponent('hovered', {}, { sync: 'none' });
 *
 * const CameraState = defineEditorSingleton('camera', {
 *   x: field.float64().default(0),
 *   y: field.float64().default(0),
 *   zoom: field.float64().default(1),
 * }, { sync: 'presence' });
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

  /** Systems that convert raw DOM events to ECS state */
  inputSystems?: System[];

  /** Systems that detect targets and compute intersections */
  captureSystems?: System[];

  /** Systems that modify document state and process commands */
  updateSystems?: System[];

  /** Systems that sync ECS state to output */
  renderSystems?: System[];

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
  teardown?: (ctx: Context) => void | Promise<void>;
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
