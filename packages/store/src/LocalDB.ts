import { type IDBPDatabase, openDB } from "idb";
import { type LoroDoc, VersionVector } from "loro-crdt";
import { throttle } from "lodash-es";

const OBJECT_STORE_NAME = "document";
const SNAPSHOT_KEY = "snapshot";
const UPDATE_KEY_PREFIX = "update-";
const METADATA_KEY = "metadata";
const CONSOLIDATION_THRESHOLD = 10;

interface Metadata {
  nextUpdateIndex: number;
  lastSnapshotVersion: Uint8Array | null;
}

export class LocalDB {
  public readonly dbName: string;

  private db: IDBPDatabase | null = null;
  private lastVersion: VersionVector | null = null;
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
      this.lastVersion = metadata.lastSnapshotVersion
        ? VersionVector.decode(metadata.lastSnapshotVersion)
        : null;
    }
  }

  public saveDoc: ReturnType<typeof throttle> = throttle(
    async (doc: LoroDoc): Promise<void> => {
      if (!this.db) {
        throw new Error(
          "LocalDB not initialized. Call initialize() before using."
        );
      }

      // Use a transaction to ensure atomic updates
      const tx = this.db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);

      // Save incremental update
      if (this.lastVersion) {
        const update = doc.export({ mode: "update", from: this.lastVersion });
        const updateKey = `${UPDATE_KEY_PREFIX}${this.nextUpdateIndex}`;
        store.put(update, updateKey);
        this.nextUpdateIndex++;
      } else {
        // First save is always a snapshot
        const snapshot = doc.export({ mode: "snapshot" });
        store.put(snapshot, SNAPSHOT_KEY);
      }

      this.lastVersion = doc.version();

      // Save metadata
      const metadata: Metadata = {
        nextUpdateIndex: this.nextUpdateIndex,
        lastSnapshotVersion: this.lastVersion?.encode() ?? null,
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
          console.error("Error during consolidation:", err)
        );
      }
    },
    2000
  );

  public async loadIntoDoc(doc: LoroDoc): Promise<void> {
    if (!this.db) {
      throw new Error(
        "LocalDB not initialized. Call initialize() before using."
      );
    }

    // Load the base snapshot
    const snapshot = await this.db.get(OBJECT_STORE_NAME, SNAPSHOT_KEY);

    // Load all incremental updates in order
    const updates: Uint8Array[] = [];
    for (let i = 0; i < this.nextUpdateIndex; i++) {
      const updateKey = `${UPDATE_KEY_PREFIX}${i}`;
      const update = await this.db.get(OBJECT_STORE_NAME, updateKey);
      if (update) {
        updates.push(update);
      }
    }

    if (snapshot) {
      doc.import(snapshot);
    }
    for (const update of updates) {
      doc.import(update);
    }

    // Set lastVersion to current doc version after loading
    this.lastVersion = doc.version();
  }

  public dispose(): void {
    this.saveDoc.cancel();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Consolidate all updates into a new snapshot and clear old updates.
   * Runs asynchronously to avoid blocking the main thread.
   */
  private async consolidate(doc: LoroDoc): Promise<void> {
    if (!this.db) {
      throw new Error(
        "LocalDB not initialized. Call initialize() before using."
      );
    }

    if (this.consolidationInProgress) {
      return; // Skip if already consolidating
    }

    this.consolidationInProgress = true;
    const updateCountToDelete = this.nextUpdateIndex;

    try {
      // Create a new snapshot with current state
      const snapshot = doc.export({ mode: "snapshot" });
      const version = doc.version();

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
        lastSnapshotVersion: version.encode(),
      };
      store.put(metadata, METADATA_KEY);

      await tx.done;

      // Only update state after successful transaction
      this.nextUpdateIndex = 0;
      this.lastVersion = version;
    } finally {
      this.consolidationInProgress = false;
    }
  }
}
