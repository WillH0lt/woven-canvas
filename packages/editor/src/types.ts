import type { Context, EntityId } from "@infinitecanvas/ecs";
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
}

/**
 * Sync determines how component changes propagate
 */
export type SyncBehavior =
  | "document" // Persisted to database, synced to all clients
  | "presence" // Synced via websocket for presence (cursors, selections)
  | "local" // Cached in local storage only (session data, camera position)
  | "none"; // Not synced or stored anywhere

/**
 * Editor metadata attached to component definitions
 */
export interface EditorComponentMeta {
  sync: SyncBehavior;
}

export type SystemPhase = "input" | "capture" | "update" | "render";
