import type { Context, EntityId } from "@infinitecanvas/ecs";

/**
 * Sync determines how component changes propagate
 */
export type SyncBehavior =
  | "document" // Persisted to database, synced to all clients
  | "presence" // Synced via websocket for presence (cursors, selections)
  | "local" // Cached in local storage only (session data, camera position)
  | "none"; // Not synced or stored anywhere

/**
 * Data structure category
 */
export type DataCategory = "block" | "meta" | "singleton";

/**
 * Editor metadata attached to component definitions
 */
export interface EditorComponentMeta {
  category: DataCategory;
  sync: SyncBehavior;
}

/**
 * System function signature
 */
export type SystemFn = (ctx: EditorContext) => void;

/**
 * Editor context extends ECS context with editor-specific data
 */
export interface EditorContext extends Context {
  /** The editor instance */
  editor: EditorInstance;
}

/**
 * Minimal editor interface for context (avoids circular deps)
 */
export interface EditorInstance {
  nextTick(callback: (ctx: EditorContext) => void): void;
}

/**
 * Re-export commonly used ECS types
 */
export type { Context, EntityId };
