import type { EditorComponentDef, EditorSingletonDef } from "./types";
import type { PhaseSystem } from "./phase";
import type { Editor } from "./Editor";

/**
 * Editor plugin interface.
 *
 * Plugins extend the editor with:
 * - Components (block and meta data)
 * - Singletons (global state)
 * - Systems (behavior in specific phases)
 * - Commands (user actions)
 *
 * @example
 * ```typescript
 * import { EditorPlugin, defineBlock, defineMeta, defineCaptureSystem } from '@infinitecanvas/editor';
 *
 * const SelectionPlugin: EditorPlugin = {
 *   name: 'selection',
 *
 *   components: [
 *     defineMeta({}, { sync: 'presence' }), // Selected
 *     defineMeta({}, { sync: 'none' }),     // Hovered
 *   ],
 *
 *   systems: [
 *     defineCaptureSystem('hover', (ctx) => {
 *       // Detect hover state
 *     }),
 *     defineCaptureSystem('selection', (ctx) => {
 *       // Handle selection logic
 *     }),
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
 *   setup(editor) {
 *     console.log('Selection plugin initialized');
 *   },
 *
 *   teardown(editor) {
 *     console.log('Selection plugin destroyed');
 *   }
 * };
 * ```
 */
export interface EditorPlugin {
  /** Unique plugin identifier */
  name: string;

  /**
   * Names of plugins this one depends on.
   * Dependencies are loaded before this plugin.
   */
  dependencies?: string[];

  /**
   * Block and meta components to register.
   * These are created with defineBlock() or defineMeta().
   */
  components?: EditorComponentDef[];

  /**
   * Singletons to register.
   * These are created with defineSingleton().
   */
  singletons?: EditorSingletonDef[];

  /**
   * Systems to register, organized by phase.
   * Create with defineInputSystem, defineCaptureSystem, etc.
   */
  systems?: PhaseSystem[];

  /**
   * Called when the plugin is initialized.
   * Use this for one-time setup like adding event listeners.
   */
  setup?: (editor: Editor) => void | Promise<void>;

  /**
   * Called when the editor is destroyed.
   * Use this to clean up resources.
   */
  teardown?: (editor: Editor) => void | Promise<void>;
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
