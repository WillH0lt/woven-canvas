import type { EntityId } from "./types";
import type { AnyEditorComponentDef } from "./EditorComponentDef";

/**
 * Snapshot of document state for loading.
 * Returned by `StoreAdapter.load()` to hydrate the Editor on startup.
 */
export interface DocumentSnapshot {
  /**
   * Entity data keyed by entity ID.
   * Each entity contains a map of component names to component data.
   */
  entities: Map<number, EntitySnapshot>;

  /**
   * Singleton data keyed by singleton name.
   */
  singletons: Map<string, unknown>;
}

/**
 * Snapshot of a single entity's component data.
 */
export interface EntitySnapshot {
  /**
   * Component data keyed by component name.
   */
  components: Map<string, unknown>;
}

/**
 * Describes a change to component data in the document.
 * Used by `StoreAdapter.onDocumentChange()` to batch updates.
 */
export interface DocumentChange {
  /**
   * The type of change:
   * - "added": Component was added to an entity
   * - "updated": Component data was modified
   * - "removed": Component was removed from an entity
   */
  type: "added" | "updated" | "removed";

  /**
   * The entity that was modified.
   */
  entityId: EntityId;

  /**
   * The component definition. Use `componentDef.name` for storage keys.
   */
  componentDef: AnyEditorComponentDef;

  /**
   * The component data as a plain object.
   * Present for "added" and "updated" changes, undefined for "removed".
   */
  data?: unknown;
}

/**
 * Store adapter interface for persistence and sync.
 *
 * Implement this interface to integrate with storage backends like:
 * - Local persistence (IndexedDB, localStorage)
 * - Server sync (REST, WebSocket)
 * - Real-time collaboration (CRDTs like Loro, Yjs)
 *
 * The Editor calls `onDocumentChange()` automatically when ECS state changes
 * for components with `sync: "document"` behavior.
 *
 * @example
 * ```typescript
 * class MyStore implements StoreAdapter {
 *   onDocumentChange(changes: DocumentChange[]): void {
 *     for (const change of changes) {
 *       const key = `${change.entityId}:${change.componentDef.name}`;
 *       if (change.type === "removed") {
 *         this.db.delete(key);
 *       } else {
 *         this.db.put(key, change.data);
 *       }
 *     }
 *   }
 *
 *   async load(): Promise<DocumentSnapshot> {
 *     const entities = new Map();
 *     for (const [key, data] of this.db.entries()) {
 *       const [entityId, componentName] = key.split(":");
 *       // ... reconstruct entities map
 *     }
 *     return { entities, singletons: new Map() };
 *   }
 * }
 * ```
 */
export interface StoreAdapter {
  /**
   * Called when document state changes.
   * Receives a batch of changes that occurred during the current frame.
   *
   * Changes are batched for efficiency - multiple modifications to the same
   * component within a frame are collapsed into a single "updated" change.
   *
   * @param changes - Array of document changes to persist
   */
  onDocumentChange(changes: DocumentChange[]): void;

  /**
   * Load initial document state from storage.
   * Called during `Editor.initialize()` to hydrate entities and singletons.
   *
   * Return a snapshot containing all persisted entities and their component data.
   * The Editor will recreate entities and apply component data from the snapshot.
   *
   * @returns A promise resolving to the document snapshot
   *
   * @example
   * ```typescript
   * async load(): Promise<DocumentSnapshot> {
   *   const entities = new Map();
   *   const singletons = new Map();
   *
   *   // Load entities from database
   *   for (const row of await db.entities.getAll()) {
   *     const components = new Map();
   *     for (const comp of row.components) {
   *       components.set(comp.name, comp.data);
   *     }
   *     entities.set(row.id, { components });
   *   }
   *
   *   return { entities, singletons };
   * }
   * ```
   */
  load(): Promise<DocumentSnapshot>;

  /**
   * Create a checkpoint for undo/redo.
   * Called by the Editor when the user performs an undoable action.
   * Optional - implement if your store supports undo/redo.
   */
  checkpoint?(): void;

  /**
   * Undo the last change.
   * Optional - implement if your store supports undo/redo.
   */
  undo?(): void;

  /**
   * Redo a previously undone change.
   * Optional - implement if your store supports undo/redo.
   */
  redo?(): void;
}
