import type { Context, EntityId } from "@infinitecanvas/ecs";
export type { Context };
import type { Editor } from "./Editor";

// Re-export EntityId for convenience
export type { EntityId };

/**
 * Base resources required by the Editor.
 * Plugins can extend this interface for additional resources.
 *
 * @example
 * ```typescript
 * interface MyPluginResources extends EditorResources {
 *   apiClient: ApiClient;
 * }
 * ```
 */
export interface EditorResources {
  /**
   * The DOM element to attach input listeners and render output to.
   * This should be the editor's main container or canvas element.
   */
  domElement: HTMLElement;

  /**
   * Reference to the Editor instance.
   * Use this to spawn commands, subscribe to queries, etc.
   */
  editor: Editor;

  /**
   * Plugin-specific resources keyed by plugin name.
   * Access via getPluginResources<T>(ctx, pluginName).
   * @internal Populated automatically from plugin.resources
   */
  pluginResources: Record<string, unknown>;
}

/**
 * Sync determines how component changes propagate
 */
export type SyncBehavior =
  | "document" // Persisted to database, synced to all clients
  | "presence" // Synced via websocket for presence (cursors, selections)
  | "none"; // Not synced or stored anywhere

/**
 * Editor metadata attached to component definitions
 */
export interface EditorComponentMeta {
  sync: SyncBehavior;
}

export type SystemPhase = "input" | "capture" | "update" | "render";

/**
 * Get plugin-specific resources from the context.
 *
 * @typeParam T - The expected plugin resources type
 * @param ctx - The ECS context
 * @param pluginName - The plugin name to get resources for
 * @returns The plugin resources cast to type T
 *
 * @example
 * ```typescript
 * interface ControlsOptions {
 *   zoomSpeed: number;
 *   panSpeed: number;
 * }
 *
 * const ControlsPlugin: EditorPlugin<ControlsOptions> = {
 *   name: "controls",
 *   resources: { zoomSpeed: 1.0, panSpeed: 1.0 },
 *   // ...
 * };
 *
 * // In a system:
 * function mySystem(ctx: Context) {
 *   const opts = getPluginResources<ControlsOptions>(ctx, "controls");
 *   console.log(opts.zoomSpeed);
 * }
 * ```
 */
export function getPluginResources<T>(ctx: Context, pluginName: string): T {
  const resources = ctx.resources as EditorResources;
  return resources.pluginResources[pluginName] as T;
}
