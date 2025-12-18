import type { Context } from "@infinitecanvas/ecs";
import type { AnyEditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef } from "./EditorSingletonDef";

/**
 * Store adapter interface for persistence and sync.
 *
 * Implement this interface to integrate with storage backends like:
 * - Local persistence (IndexedDB, localStorage)
 * - Server sync (REST, WebSocket)
 * - Real-time collaboration (CRDTs like Loro, Yjs)
 *
 * The Editor calls these methods automatically when ECS state changes
 * for components/singletons with `sync: "document"` behavior.
 *
 * Data is organized by component type, then by entity's stable `id` field.
 * Entity IDs (runtime numbers) are never persisted - only UUID strings.
 *
 * @example
 * ```typescript
 * class MyStore implements StoreAdapter {
 *   onComponentAdded(componentDef, id, data) {
 *     this.db.put(componentDef.name, id, data);
 *   }
 *   onComponentUpdated(componentDef, id, data) {
 *     this.db.put(componentDef.name, id, data);
 *   }
 *   onComponentRemoved(componentDef, id) {
 *     this.db.delete(componentDef.name, id);
 *   }
 *   onSingletonUpdated(singletonDef, data) {
 *     this.db.singletons.put(singletonDef.name, data);
 *   }
 *   async load() {
 *     // ... load from database
 *   }
 * }
 * ```
 */
export interface StoreAdapter {
  /**
   * Called when a component is added to an entity.
   * This is called for components with `sync: "document"` behavior.
   *
   * @param componentDef - The component definition (use `name` for storage keys)
   * @param id - The entity's stable UUID (from the component's `id` field)
   * @param data - The component data as a plain object (includes `id` field)
   */
  onComponentAdded(
    componentDef: AnyEditorComponentDef,
    id: string,
    data: unknown
  ): void;

  /**
   * Called when a component's data is modified.
   * This is called for components with `sync: "document"` behavior.
   *
   * @param componentDef - The component definition (use `name` for storage keys)
   * @param id - The entity's stable UUID (from the component's `id` field)
   * @param data - The updated component data as a plain object
   */
  onComponentUpdated(
    componentDef: AnyEditorComponentDef,
    id: string,
    data: unknown
  ): void;

  /**
   * Called when a component is removed from an entity.
   * This is called for components with `sync: "document"` behavior.
   *
   * @param componentDef - The component definition (use `name` for storage keys)
   * @param id - The entity's stable UUID
   */
  onComponentRemoved(componentDef: AnyEditorComponentDef, id: string): void;

  /**
   * Called when a singleton's data is modified.
   * Singletons are global state with exactly one instance per world.
   * This is called for singletons with `sync: "document"` behavior.
   *
   * @param singletonDef - The singleton definition (use `name` for storage keys)
   * @param data - The updated singleton data as a plain object
   */
  onSingletonUpdated(singletonDef: AnyEditorSingletonDef, data: unknown): void;

  /**
   * Commit pending changes to storage.
   * Called by the Editor at the end of each frame after all mutations are complete.
   * Use this to batch writes for better performance (e.g., CRDT commit).
   */
  commit(): void;

  /**
   * Initialize the store with the Editor's context.
   * Called by the Editor during initialization to set up bidirectional sync.
   *
   * Use this to:
   * - Store component/singleton defs for flushChanges lookup
   * - Set up persistence (IndexedDB, etc.)
   * - Connect to network sync (WebSocket, etc.)
   *
   * @param components - Array of component definitions
   * @param singletons - Array of singleton definitions
   */
  initialize(
    components: AnyEditorComponentDef[],
    singletons: AnyEditorSingletonDef[]
  ): Promise<void>;

  /**
   * Flush pending changes from the store to the ECS world.
   * Called by the Editor each frame to apply updates from
   * undo/redo operations, network sync, etc.
   *
   * The store implementation has full control over how to apply changes.
   * It receives the ECS context and can create/update/remove entities
   * and components as needed.
   *
   * @param ctx - The ECS context for applying changes
   */
  flushChanges(ctx: Context): void;
}
