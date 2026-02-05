import type { Adapter } from "../Adapter";
import type { Mutation, Patch, ComponentData } from "../types";
import { Origin } from "../constants";
import { openStore, type KeyValueStore } from "../storage";
import { migratePatch } from "../migrations";
import type { AnyEditorComponentDef } from "../EditorComponentDef";
import type { AnyEditorSingletonDef } from "../EditorSingletonDef";

export interface PersistenceAdapterOptions {
  documentId: string;
  components: AnyEditorComponentDef[];
  singletons: AnyEditorSingletonDef[];
}

/**
 * IndexedDB adapter for local persistence.
 *
 * Stores document state locally and provides it on page load.
 * State is stored as key-value pairs where keys are merge keys
 * (entityId/componentName or SINGLETON_ENTITY_ID/singletonName).
 */
export class PersistenceAdapter implements Adapter {
  private store: KeyValueStore | null = null;
  private documentId: string;
  private pendingPatch: Patch | null = null;
  private componentsByName: Map<
    string,
    AnyEditorComponentDef | AnyEditorSingletonDef
  >;

  constructor(options: PersistenceAdapterOptions) {
    this.documentId = options.documentId;

    this.componentsByName = new Map();
    for (const def of [...options.components, ...options.singletons]) {
      this.componentsByName.set(def.name, def);
    }
  }

  async init(): Promise<void> {
    try {
      this.store = await openStore(this.documentId, "state");
      await this.loadState();
    } catch (err) {
      console.error("IndexedDB error:", err);
    }
  }

  /**
   * Load persisted state and convert to merge mutations.
   */
  private async loadState(): Promise<void> {
    if (!this.store) return;

    const entries = await this.store.getAllEntries();

    // Convert stored state to a single merge mutation
    const mergeDiff: Patch = {};

    for (const [key, value] of entries) {
      mergeDiff[key] = value as ComponentData;
    }

    if (Object.keys(mergeDiff).length === 0) return;

    // Migrate any out-of-date components
    const patch = migratePatch(mergeDiff, this.componentsByName);

    // Write migrated entries back to the store
    if (patch !== mergeDiff) {
      for (const [key, value] of Object.entries(patch)) {
        this.store.put(key, value);
      }
    }

    this.pendingPatch = patch;
  }

  /**
   * Push mutations - persists to IndexedDB.
   */
  push(mutations: Mutation[]): void {
    if (!this.store) return;

    const filtered = mutations.filter(
      (m) => m.origin !== Origin.Persistence && m.syncBehavior !== "ephemeral",
    );
    if (filtered.length === 0) return;

    // Fire and forget - don't await
    this.persistMutations(filtered).catch((err) => {
      console.error("Error persisting mutations:", err);
    });
  }

  private async persistMutations(mutations: Mutation[]): Promise<void> {
    if (!this.store) return;

    for (const { patch } of mutations) {
      for (const [key, value] of Object.entries(patch)) {
        if (value._exists === false) {
          // Deletion
          this.store.delete(key);
        } else if (value._exists) {
          // Full replacement
          this.store.put(key, value);
        } else {
          // Partial update - merge with existing
          const existing = await this.store.get<Record<string, unknown>>(key);
          if (existing) {
            this.store.put(key, { ...existing, ...value });
          }
        }
      }
    }
  }

  /**
   * Pull pending mutation (loaded from storage on init).
   */
  pull(): Mutation[] {
    if (!this.pendingPatch) return [];
    const mutation: Mutation = {
      patch: this.pendingPatch,
      origin: Origin.Persistence,
      syncBehavior: "document",
    };
    this.pendingPatch = null;
    return [mutation];
  }

  /**
   * Close the adapter.
   */
  close(): void {
    if (this.store) {
      this.store.close();
      this.store = null;
    }
  }

  /**
   * Clear all persisted state and pending patches.
   */
  async clearAll(): Promise<void> {
    this.pendingPatch = null;
    if (!this.store) return;
    await this.store.clear();
  }
}
