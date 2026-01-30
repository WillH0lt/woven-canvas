import type { Adapter } from "../Adapter";
import type { Mutation, Patch, ComponentData } from "../types";
import { Origin } from "../constants";
import { openStore, type KeyValueStore } from "../storage";

export interface PersistenceAdapterOptions {
  documentId: string;
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

  constructor(options: PersistenceAdapterOptions) {
    this.documentId = options.documentId;
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

    // Convert stored state to a single merge mutation with _exists flags
    const mergeDiff: Patch = {};

    for (const [key, value] of entries) {
      // Add _exists: true to indicate this component should be created
      mergeDiff[key] = { _exists: true, ...(value as Record<string, unknown>) } as ComponentData;
    }

    if (Object.keys(mergeDiff).length > 0) {
      this.pendingPatch = mergeDiff;
    }
  }

  /**
   * Push mutations - persists to IndexedDB.
   */
  push(mutations: Mutation[]): void {
    if (!this.store) return;

    const filtered = mutations.filter((m) => m.origin !== Origin.Persistence);
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
        } else {
          // Add or update - merge with existing state
          const { _exists, ...data } = value;

          if (_exists) {
            // Full replacement (new component)
            this.store.put(key, data);
          } else {
            // Partial update - merge with existing
            const existing = await this.store.get<Record<string, unknown>>(key);
            if (existing) {
              this.store.put(key, { ...existing, ...data });
            }
          }
        }
      }
    }
  }

  /**
   * Pull pending mutation (loaded from storage on init).
   */
  pull(): Mutation | null {
    if (!this.pendingPatch) return null;
    const mutation = { patch: this.pendingPatch, origin: Origin.Persistence };
    this.pendingPatch = null;
    return mutation;
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
   * Clear all persisted state.
   */
  async clear(): Promise<void> {
    if (!this.store) return;
    await this.store.clear();
  }
}
