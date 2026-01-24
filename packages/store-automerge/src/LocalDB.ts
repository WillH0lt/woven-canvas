import { type IDBPDatabase, openDB } from "idb";
import * as Automerge from "@automerge/automerge";

const OBJECT_STORE_NAME = "document";
const SNAPSHOT_KEY = "snapshot";
const UPDATE_KEY_PREFIX = "update-";
const METADATA_KEY = "metadata";
const CONSOLIDATION_THRESHOLD = 20;

interface Metadata {
  nextUpdateIndex: number;
  lastHeads: string[] | null;
}

/**
 * Document structure for Automerge.
 * Components are stored as: components -> componentName -> id -> data
 * Singletons are stored as: singletons -> name -> data
 * Ephemeral data is NOT stored here (handled separately).
 */
export interface AutomergeDocData {
  components: {
    [componentName: string]: { [id: string]: Record<string, unknown> };
  };
  singletons: { [name: string]: unknown };
  [key: string]: unknown; // Index signature for Automerge compatibility
}

/**
 * LocalDB - Automerge-based persistence using IndexedDB.
 *
 * Uses incremental saves with periodic consolidation for efficiency.
 * Stores document as a base snapshot plus incremental changes.
 */
export class LocalDB {
  public readonly dbName: string;

  private db: IDBPDatabase | null = null;
  private lastHeads: Automerge.Heads | null = null;
  private nextUpdateIndex: number = 0;
  private consolidationInProgress: boolean = false;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  public async initialize(): Promise<void> {
    this.db = await openDB(this.dbName, 1, {
      upgrade(db) {
        db.createObjectStore(OBJECT_STORE_NAME);
      },
    });

    // Load metadata to know the next update index
    const metadata = (await this.db.get(OBJECT_STORE_NAME, METADATA_KEY)) as
      | Metadata
      | undefined;
    if (metadata) {
      this.nextUpdateIndex = metadata.nextUpdateIndex;
      this.lastHeads = metadata.lastHeads as Automerge.Heads | null;
    }
  }

  /**
   * Track pending save operations.
   */
  private pendingSave: Promise<void> = Promise.resolve();
  private latestDoc: Automerge.Doc<AutomergeDocData> | null = null;

  /**
   * Wait for any pending save operations to complete.
   * Also triggers immediate save of any queued document.
   */
  public async flush(): Promise<void> {
    // Wait for any current save to complete first
    await this.pendingSave;

    // If there's a pending document, save it immediately and wait
    if (this.latestDoc) {
      const savePromise = this.saveDocInternal(this.latestDoc);
      this.pendingSave = savePromise;
      this.latestDoc = null;
      await savePromise;
    }
  }

  /**
   * Save the document. Queues the document for saving with throttling.
   * The latest document state will be saved when the throttle fires.
   */
  public saveDoc = (doc: Automerge.Doc<AutomergeDocData>): void => {
    this.latestDoc = doc;
    this.scheduleSave();
  };

  private scheduleSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly THROTTLE_MS = 2000;

  private scheduleSave = (): void => {
    // If no timer is set, save immediately and start the throttle window
    if (!this.scheduleSaveTimer && this.latestDoc) {
      const doc = this.latestDoc;
      this.latestDoc = null;
      this.pendingSave = this.saveDocInternal(doc);

      // Start throttle window
      this.scheduleSaveTimer = setTimeout(() => {
        this.scheduleSaveTimer = null;
        // If there's a queued document, schedule it
        if (this.latestDoc) {
          this.scheduleSave();
        }
      }, this.THROTTLE_MS);
    }
    // Otherwise, the document is queued in latestDoc and will be saved when the timer fires
  };

  private async saveDocInternal(
    doc: Automerge.Doc<AutomergeDocData>,
  ): Promise<void> {
    if (!this.db) {
      throw new Error(
        "LocalDB not initialized. Call initialize() before using.",
      );
    }

    // Use a transaction to ensure atomic updates
    const tx = this.db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = tx.objectStore(OBJECT_STORE_NAME);

    const currentHeads = Automerge.getHeads(doc);

    // Save incremental update or initial snapshot
    if (this.lastHeads) {
      // Incremental update: save only changes since lastHeads
      const update = Automerge.saveSince(doc, this.lastHeads);
      if (update.byteLength > 0) {
        const updateKey = `${UPDATE_KEY_PREFIX}${this.nextUpdateIndex}`;
        store.put(update, updateKey);
        this.nextUpdateIndex++;
      }
    } else {
      // First save: create a full snapshot
      const snapshot = Automerge.save(doc);
      store.put(snapshot, SNAPSHOT_KEY);
    }

    this.lastHeads = currentHeads;

    // Save metadata
    const metadata: Metadata = {
      nextUpdateIndex: this.nextUpdateIndex,
      lastHeads: currentHeads as string[],
    };
    store.put(metadata, METADATA_KEY);

    await tx.done;

    // Consolidate if we have too many updates (run asynchronously)
    if (
      this.nextUpdateIndex >= CONSOLIDATION_THRESHOLD &&
      !this.consolidationInProgress
    ) {
      // Don't await - let it run in the background
      this.consolidate(doc).catch((err) =>
        console.error("Error during consolidation:", err),
      );
    }
  }

  /**
   * Load document from IndexedDB.
   * Returns a new Automerge document with all persisted data.
   */
  public async load(): Promise<Automerge.Doc<AutomergeDocData>> {
    if (!this.db) {
      throw new Error(
        "LocalDB not initialized. Call initialize() before using.",
      );
    }

    // Load the base snapshot
    const snapshot = (await this.db.get(OBJECT_STORE_NAME, SNAPSHOT_KEY)) as
      | Uint8Array
      | undefined;

    // Load all incremental updates in order
    const updates: Uint8Array[] = [];
    for (let i = 0; i < this.nextUpdateIndex; i++) {
      const updateKey = `${UPDATE_KEY_PREFIX}${i}`;
      const update = await this.db.get(OBJECT_STORE_NAME, updateKey);
      if (update) {
        updates.push(update);
      }
    }

    let doc: Automerge.Doc<AutomergeDocData>;
    let hadExistingData = false;

    if (snapshot) {
      // Load from snapshot
      doc = Automerge.load<AutomergeDocData>(snapshot);
      hadExistingData = true;
    } else {
      // Create new document with initial structure
      doc = Automerge.from<AutomergeDocData>({
        components: {},
        singletons: {},
      });
    }

    // Apply all incremental updates
    for (const update of updates) {
      doc = Automerge.loadIncremental(doc, update);
      hadExistingData = true;
    }

    // Only set lastHeads if we loaded from existing data
    // Otherwise, the first save should create a full snapshot
    if (hadExistingData) {
      this.lastHeads = Automerge.getHeads(doc);
    }

    return doc;
  }

  public dispose(): void {
    // Clear the throttle timer
    if (this.scheduleSaveTimer) {
      clearTimeout(this.scheduleSaveTimer);
      this.scheduleSaveTimer = null;
    }
    this.latestDoc = null;
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Consolidate all updates into a new snapshot and clear old updates.
   * Runs asynchronously to avoid blocking the main thread.
   */
  private async consolidate(
    doc: Automerge.Doc<AutomergeDocData>,
  ): Promise<void> {
    if (!this.db) {
      throw new Error(
        "LocalDB not initialized. Call initialize() before using.",
      );
    }

    if (this.consolidationInProgress) {
      return; // Skip if already consolidating
    }

    this.consolidationInProgress = true;

    try {
      // Wait for any pending saves to complete before consolidating
      await this.pendingSave;

      // If there's a queued document, save it first
      if (this.latestDoc) {
        const savePromise = this.saveDocInternal(this.latestDoc);
        this.pendingSave = savePromise;
        this.latestDoc = null;
        await savePromise;
      }

      // Now get the actual count of updates to delete
      const updateCountToDelete = this.nextUpdateIndex;

      // Load the current state to ensure we have all changes
      const currentDoc = await this.load();

      // Create a new full snapshot with current state
      const snapshot = Automerge.save(currentDoc);
      const heads = Automerge.getHeads(currentDoc);

      // Use a transaction to ensure all operations succeed or fail together
      const tx = this.db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);

      // Put new snapshot
      store.put(snapshot, SNAPSHOT_KEY);

      // Delete all old updates
      for (let i = 0; i < updateCountToDelete; i++) {
        const updateKey = `${UPDATE_KEY_PREFIX}${i}`;
        store.delete(updateKey);
      }

      // Update metadata
      const metadata: Metadata = {
        nextUpdateIndex: 0,
        lastHeads: heads as string[],
      };
      store.put(metadata, METADATA_KEY);

      await tx.done;

      // Only update state after successful transaction
      this.nextUpdateIndex = 0;
      this.lastHeads = heads;
    } finally {
      this.consolidationInProgress = false;
    }
  }
}
