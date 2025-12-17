import { LoroDoc, LoroMap, UndoManager, VersionVector } from "loro-crdt";
import { LoroWebsocketClient } from "loro-websocket";
import { LoroAdaptor } from "loro-adaptors/loro";
import { openDB, type IDBPDatabase } from "idb";
import type {
  StoreAdapter,
  DocumentChange,
  DocumentSnapshot,
  EntitySnapshot,
} from "@infinitecanvas/editor";

const OBJECT_STORE_NAME = "document";
const SNAPSHOT_KEY = "snapshot";
const UPDATE_KEY_PREFIX = "update-";
const METADATA_KEY = "metadata";
const CONSOLIDATION_THRESHOLD = 10;

interface Metadata {
  nextUpdateIndex: number;
}

export interface LoroStoreOptions {
  /** IndexedDB database name for local persistence */
  dbName?: string;
  /** WebSocket URL for real-time sync (optional) */
  websocketUrl?: string;
  /** Room ID for multiplayer (defaults to "default") */
  roomId?: string;
  /** Throttle delay for saves in ms (defaults to 2000) */
  saveDelayMs?: number;
}

/**
 * LoroStore - A StoreAdapter using Loro CRDT for local-first multiplayer.
 *
 * Features:
 * - Local persistence via IndexedDB (incremental updates + snapshots)
 * - Real-time multiplayer via WebSocket (optional)
 * - Undo/redo via Loro's UndoManager
 * - Automatic CRDT conflict resolution
 *
 * @example
 * ```typescript
 * const store = new LoroStore({
 *   dbName: "my-app",
 *   websocketUrl: "ws://localhost:8787",  // optional
 *   roomId: "my-document",
 * });
 *
 * await store.initialize();
 *
 * const editor = new Editor(container, {
 *   store,
 *   plugins: [...],
 * });
 * ```
 */
export class LoroStore implements StoreAdapter {
  private doc: LoroDoc;
  private undoManager: UndoManager;

  // Persistence
  private db: IDBPDatabase | null = null;
  private dbName: string;
  private lastVersion: VersionVector | null = null;
  private nextUpdateIndex: number = 0;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private saveDelayMs: number;

  // Network
  private client: LoroWebsocketClient | null = null;
  private adaptor: LoroAdaptor | null = null;
  private websocketUrl?: string;
  private roomId: string;

  private initialized: boolean = false;

  /** Map from component def ID to container name */
  private componentNames: Map<number, string> = new Map();

  constructor(options: LoroStoreOptions = {}) {
    this.dbName = options.dbName ?? "infinitecanvas";
    this.websocketUrl = options.websocketUrl;
    this.roomId = options.roomId ?? "default";
    this.saveDelayMs = options.saveDelayMs ?? 2000;

    this.doc = new LoroDoc();
    this.undoManager = new UndoManager(this.doc, {
      excludeOriginPrefixes: ["sys:"],
    });
  }

  /**
   * Initialize the store.
   * Loads from IndexedDB and connects to WebSocket if configured.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize IndexedDB
    this.db = await openDB(this.dbName, 1, {
      upgrade(db) {
        db.createObjectStore(OBJECT_STORE_NAME);
      },
    });

    // Load metadata
    const metadata = (await this.db.get(
      OBJECT_STORE_NAME,
      METADATA_KEY
    )) as Metadata | undefined;

    if (metadata) {
      this.nextUpdateIndex = metadata.nextUpdateIndex;
    }

    // Load from IndexedDB
    await this.loadFromDB();

    // Connect to WebSocket if configured
    if (this.websocketUrl) {
      this.adaptor = new LoroAdaptor(this.doc);
      this.client = new LoroWebsocketClient({ url: this.websocketUrl });
      await this.client.waitConnected();
      await this.client.join({
        roomId: this.roomId,
        crdtAdaptor: this.adaptor,
      });
    }

    // Subscribe to doc changes for persistence
    this.doc.subscribe(() => {
      this.scheduleSave();
    });

    this.initialized = true;
  }

  /**
   * Register a component name for a def ID.
   * Used to create named containers in Loro.
   */
  registerComponent(defId: number, name: string): void {
    this.componentNames.set(defId, name);
  }

  /**
   * Get the Loro document for direct access.
   */
  getDoc(): LoroDoc {
    return this.doc;
  }

  /**
   * Called when document data changes in the ECS.
   */
  onDocumentChange = (changes: DocumentChange[]): void => {
    const entitiesMap = this.doc.getMap("entities");

    for (const change of changes) {
      const defId = (change.componentDef as any)._defId as number;
      const containerName =
        this.componentNames.get(defId) ?? `component_${defId}`;

      if (change.type === "removed") {
        const entityMap = entitiesMap.get(
          String(change.entityId)
        ) as LoroMap | undefined;
        if (entityMap) {
          entityMap.delete(containerName);
        }
      } else {
        let entityMap = entitiesMap.get(
          String(change.entityId)
        ) as LoroMap | undefined;
        if (!entityMap) {
          entitiesMap.setContainer(String(change.entityId), new LoroMap());
          entityMap = entitiesMap.get(String(change.entityId)) as LoroMap;
        }
        entityMap.set(containerName, change.data);
      }
    }

    this.doc.commit({ origin: "local" });
  };

  /**
   * Load initial document state from Loro.
   */
  load = async (): Promise<DocumentSnapshot> => {
    const entities = new Map<number, EntitySnapshot>();
    const singletons = new Map<number, unknown>();

    const entitiesMap = this.doc.getMap("entities");

    for (const [entityIdStr, entityData] of entitiesMap.entries()) {
      const entityId = parseInt(entityIdStr, 10);
      if (isNaN(entityId)) continue;

      const entityMap = entityData as LoroMap;
      const components = new Map<number, unknown>();

      for (const [defIdOrName, data] of entityMap.entries()) {
        let defId: number | undefined;
        for (const [id, name] of this.componentNames) {
          if (name === defIdOrName) {
            defId = id;
            break;
          }
        }
        if (defId === undefined) {
          const parsed = parseInt(defIdOrName.replace("component_", ""), 10);
          if (!isNaN(parsed)) {
            defId = parsed;
          }
        }
        if (defId !== undefined) {
          components.set(defId, data);
        }
      }

      entities.set(entityId, { components });
    }

    const singletonsMap = this.doc.getMap("singletons");
    for (const [defIdStr, data] of singletonsMap.entries()) {
      const defId = parseInt(defIdStr, 10);
      if (!isNaN(defId)) {
        singletons.set(defId, data);
      }
    }

    return { entities, singletons };
  };

  /**
   * Create a checkpoint for undo/redo.
   */
  checkpoint = (): void => {
    // Loro's UndoManager tracks changes automatically
  };

  /**
   * Undo to the previous state.
   */
  undo = (): void => {
    if (this.undoManager.canUndo()) {
      this.undoManager.undo();
    }
  };

  /**
   * Redo to the next state.
   */
  redo = (): void => {
    if (this.undoManager.canRedo()) {
      this.undoManager.redo();
    }
  };

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /**
   * Disconnect and cleanup resources.
   */
  async dispose(): Promise<void> {
    // Flush pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      await this.saveNow();
    }

    // Disconnect WebSocket
    if (this.client) {
      this.client.close();
      this.client = null;
    }

    // Close IndexedDB
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
  }

  // ─────────────────────────────────────────────────────────────
  // Private: IndexedDB persistence
  // ─────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    if (this.saveTimeout) return;

    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveNow().catch((err) =>
        console.error("Error saving to IndexedDB:", err)
      );
    }, this.saveDelayMs);
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    // Load snapshot
    const snapshot = (await this.db.get(
      OBJECT_STORE_NAME,
      SNAPSHOT_KEY
    )) as Uint8Array | undefined;

    // Load all updates in order
    const updates: Uint8Array[] = [];
    for (let i = 0; i < this.nextUpdateIndex; i++) {
      const update = (await this.db.get(
        OBJECT_STORE_NAME,
        `${UPDATE_KEY_PREFIX}${i}`
      )) as Uint8Array | undefined;
      if (update) {
        updates.push(update);
      }
    }

    // Import into doc
    if (snapshot) {
      this.doc.import(snapshot);
    }
    for (const update of updates) {
      this.doc.import(update);
    }

    this.lastVersion = this.doc.version();
  }

  private async saveNow(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = tx.objectStore(OBJECT_STORE_NAME);

    if (this.lastVersion) {
      // Save incremental update
      const update = this.doc.export({ mode: "update", from: this.lastVersion });
      const updateKey = `${UPDATE_KEY_PREFIX}${this.nextUpdateIndex}`;
      store.put(update, updateKey);
      this.nextUpdateIndex++;
    } else {
      // First save is a snapshot
      const snapshot = this.doc.export({ mode: "snapshot" });
      store.put(snapshot, SNAPSHOT_KEY);
    }

    this.lastVersion = this.doc.version();

    // Save metadata
    const metadata: Metadata = { nextUpdateIndex: this.nextUpdateIndex };
    store.put(metadata, METADATA_KEY);

    await tx.done;

    // Consolidate if needed
    if (this.nextUpdateIndex >= CONSOLIDATION_THRESHOLD) {
      await this.consolidate();
    }
  }

  private async consolidate(): Promise<void> {
    if (!this.db) return;

    const snapshot = this.doc.export({ mode: "snapshot" });
    const tx = this.db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = tx.objectStore(OBJECT_STORE_NAME);

    // Save new snapshot
    store.put(snapshot, SNAPSHOT_KEY);

    // Delete old updates
    for (let i = 0; i < this.nextUpdateIndex; i++) {
      store.delete(`${UPDATE_KEY_PREFIX}${i}`);
    }

    // Reset metadata
    this.nextUpdateIndex = 0;
    store.put({ nextUpdateIndex: 0 } as Metadata, METADATA_KEY);

    await tx.done;

    this.lastVersion = this.doc.version();
  }
}
