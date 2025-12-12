import type { EntityId } from "./types";
import type { AnyEditorComponentDef as EditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef as EditorSingletonDef } from "./EditorSingletonDef";

/**
 * Represents a change to document data
 */
export interface DocumentChange {
  /** The entity that changed */
  entityId: EntityId;
  /** The component definition that changed */
  componentDef: EditorComponentDef | EditorSingletonDef;
  /** Type of change */
  type: "added" | "changed" | "removed";
  /** Current data (undefined for removed) */
  data?: unknown;
}

/**
 * Represents a change to presence data (cursors, selections)
 */
export interface PresenceChange {
  /** The entity that changed */
  entityId: EntityId;
  /** The component definition that changed */
  componentDef: EditorComponentDef | EditorSingletonDef;
  /** Type of change */
  type: "added" | "changed" | "removed";
  /** Current data (undefined for removed) */
  data?: unknown;
}

/**
 * Represents a change to local-only data
 */
export interface LocalChange {
  /** The entity that changed */
  entityId: EntityId;
  /** The component definition that changed */
  componentDef: EditorComponentDef | EditorSingletonDef;
  /** Type of change */
  type: "added" | "changed" | "removed";
  /** Current data (undefined for removed) */
  data?: unknown;
}

/**
 * Snapshot of document state for loading
 */
export interface DocumentSnapshot {
  /** Entity data keyed by entity ID */
  entities: Map<EntityId, EntitySnapshot>;
  /** Singleton data keyed by component def ID */
  singletons: Map<number, unknown>;
}

/**
 * Snapshot of a single entity
 */
export interface EntitySnapshot {
  /** Component data keyed by component def ID */
  components: Map<number, unknown>;
}

/**
 * Store adapter interface for persistence and sync.
 *
 * Implement this interface to add:
 * - Local persistence (IndexedDB)
 * - Server sync (REST, WebSocket)
 * - Real-time collaboration (CRDTs like Loro)
 * - Undo/redo history
 *
 * All methods are optional - implement only what you need.
 *
 * @example
 * ```typescript
 * const localStore: StoreAdapter = {
 *   onDocumentChange(changes) {
 *     for (const change of changes) {
 *       indexedDB.put('entities', change.entityId, change.data);
 *     }
 *   },
 *
 *   async load() {
 *     const entities = await indexedDB.getAll('entities');
 *     return { entities, singletons: new Map() };
 *   },
 *
 *   checkpoint() {
 *     // Save current state to undo stack
 *   },
 *
 *   undo() {
 *     // Restore previous checkpoint
 *   },
 *
 *   redo() {
 *     // Restore next checkpoint
 *   }
 * };
 * ```
 */
export interface StoreAdapter {
  /**
   * Called when document data changes (blocks, meta with sync='document').
   * Use this to persist changes to database or sync to server.
   */
  onDocumentChange?: (changes: DocumentChange[]) => void;

  /**
   * Called when presence data changes (components with sync='presence').
   * Use this to broadcast cursor positions, selections, etc.
   */
  onPresenceChange?: (changes: PresenceChange[]) => void;

  /**
   * Called when local data changes (components with sync='local').
   * Use this to cache session data in localStorage/IndexedDB.
   */
  onLocalChange?: (changes: LocalChange[]) => void;

  /**
   * Load initial document state.
   * Called during editor initialization.
   */
  load?: () => Promise<DocumentSnapshot>;

  /**
   * Create a checkpoint for undo/redo.
   * Called after significant user actions.
   */
  checkpoint?: () => void;

  /**
   * Undo to the previous checkpoint.
   */
  undo?: () => void;

  /**
   * Redo to the next checkpoint.
   */
  redo?: () => void;
}
