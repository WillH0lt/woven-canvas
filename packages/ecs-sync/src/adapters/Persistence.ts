import { type IDBPDatabase, openDB } from "idb";
import type { Adapter } from "../Adapter";
import type { Mutation, Patch, ComponentData } from "../types";
import { Origin } from "../constants";

const STORE_NAME = "state";

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
  private db: IDBPDatabase | null = null;
  private documentId: string;
  private pendingPatch: Patch | null = null;

  constructor(options: PersistenceAdapterOptions) {
    this.documentId = options.documentId;
  }

  async init(): Promise<void> {
    try {
      this.db = await openDB(this.documentId, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
      await this.loadState();
    } catch (err) {
      console.error("IndexedDB error:", err);
    }
  }

  /**
   * Load persisted state and convert to merge mutations.
   */
  private async loadState(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const keys = await store.getAllKeys();
    const values = await store.getAll();

    // Convert stored state to a single merge mutation with _exists flags
    const mergeDiff: Patch = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      const value = values[i] as Record<string, unknown>;

      // Add _exists: true to indicate this component should be created
      mergeDiff[key] = { _exists: true, ...value } as ComponentData;
    }

    if (Object.keys(mergeDiff).length > 0) {
      this.pendingPatch = mergeDiff;
    }
  }

  /**
   * Push mutations - persists to IndexedDB.
   */
  push(mutations: Mutation[]): void {
    if (!this.db) return;

    const filtered = mutations.filter((m) => m.origin !== Origin.Persistence);
    if (filtered.length === 0) return;

    // Fire and forget - don't await
    this.persistMutations(filtered).catch((err) => {
      console.error("Error persisting mutations:", err);
    });
  }

  private async persistMutations(mutations: Mutation[]): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const { patch } of mutations) {
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) {
          // Deletion
          store.delete(key);
        } else {
          // Add or update - merge with existing state
          const { _exists, ...data } = value;

          if (_exists) {
            // Full replacement (new component)
            store.put(data, key);
          } else {
            // Partial update - merge with existing
            const existing = await store.get(key);
            if (existing) {
              store.put({ ...existing, ...data }, key);
            }
          }
        }
      }
    }

    await tx.done;
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
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Clear all persisted state.
   */
  async clear(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await tx.done;
  }
}
