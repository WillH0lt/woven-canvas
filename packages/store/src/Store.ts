import {
  LoroDoc,
  LoroMap,
  UndoManager,
  type LoroEventBatch,
  type MapDiff,
} from "loro-crdt";
import { LoroWebsocketClient } from "loro-websocket";
import { LoroAdaptor } from "loro-adaptors/loro";
import {
  createEntity,
  addComponent,
  removeEntity,
  hasComponent,
  type Context,
  type StoreAdapter,
  type AnyEditorComponentDef,
  type AnyEditorSingletonDef,
} from "@infinitecanvas/editor";
import { LocalDB } from "./LocalDB";

/**
 * StoreOptions - Options for configuring the Store.
 */
export interface StoreOptions {
  /** IndexedDB database name for local persistence */
  dbName?: string;
  /** WebSocket URL for real-time sync (optional) */
  websocketUrl?: string;
  /** Room ID for multiplayer (defaults to "default") */
  roomId?: string;
}

/**
 * Store - A StoreAdapter using Loro CRDT for local-first multiplayer.
 *
 * Features:
 * - Local persistence via IndexedDB (incremental updates + snapshots)
 * - Real-time multiplayer via WebSocket (optional)
 * - Undo/redo via Loro's UndoManager
 * - Automatic CRDT conflict resolution
 *
 * @example
 * ```typescript
 * const store = new Store({
 *   roomId: "my-document",
 *   dbName: "my-app", // optional
 *   websocketUrl: "ws://localhost:8787",  // optional
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
export class Store implements StoreAdapter {
  private doc: LoroDoc;
  private undoManager: UndoManager;

  // Persistence
  private localDB?: LocalDB;

  // Network
  private client: LoroWebsocketClient | null = null;
  private adaptor: LoroAdaptor | null = null;
  private websocketUrl?: string;
  private roomId: string;

  private initialized: boolean = false;

  // Bidirectional sync state
  /** Map of component name -> component def for applying changes */
  private componentDefsByName: Map<string, AnyEditorComponentDef> = new Map();
  /** Map of singleton name -> singleton def for applying changes */
  private singletonDefsByName: Map<string, AnyEditorSingletonDef> = new Map();
  /** Map of _id -> entityId for tracking entities we've created */
  private idToEntityId: Map<string, number> = new Map();
  /** Map of entityId -> _id for reverse lookup */
  private entityIdToId: Map<number, string> = new Map();
  /** Cached events from external changes (undo/redo, network sync) */
  private pendingEvents: LoroEventBatch[] = [];

  constructor(options: StoreOptions = {}) {
    console.log("Store options:", options);

    this.websocketUrl = options.websocketUrl;
    this.roomId = options.roomId ?? "default";

    if (options.dbName) {
      this.localDB = new LocalDB(options.dbName);
    }

    this.doc = new LoroDoc();
    this.undoManager = new UndoManager(this.doc, {
      excludeOriginPrefixes: ["sys:"],
    });
  }

  /**
   * Initialize the store with component/singleton definitions.
   * Loads from IndexedDB and connects to WebSocket if configured.
   *
   * Called by the Editor during initialization to set up bidirectional sync.
   *
   * @param components - Array of component definitions
   * @param singletons - Array of singleton definitions
   */
  async initialize(
    components: AnyEditorComponentDef[],
    singletons: AnyEditorSingletonDef[]
  ): Promise<void> {
    if (this.initialized) return;

    // Build name -> def maps for flushChanges lookup
    for (const componentDef of components) {
      this.componentDefsByName.set(componentDef.name, componentDef);
    }
    for (const singletonDef of singletons) {
      this.singletonDefsByName.set(singletonDef.name, singletonDef);
    }

    // Subscribe to doc changes for persistence and caching external events
    this.doc.subscribe((event: LoroEventBatch) => {
      this.localDB?.saveDoc(this.doc);

      // Cache external events (undo/redo, network sync) for flushChanges
      // Skip local changes since they already went through the ECS
      if (event.origin !== "editor") {
        this.pendingEvents.push(event);
      }
    });

    // Initialize local persistence and load document
    if (this.localDB) {
      await this.localDB.initialize();
      await this.localDB.loadIntoDoc(this.doc);
    }

    // Connect to WebSocket if configured
    if (this.websocketUrl) {
      console.log(`Connecting to WebSocket at ${this.websocketUrl}...`);
      this.adaptor = new LoroAdaptor(this.doc);
      this.client = new LoroWebsocketClient({ url: this.websocketUrl });
      await this.client.waitConnected();
      await this.client.join({
        roomId: this.roomId,
        crdtAdaptor: this.adaptor,
      });
    }

    this.initialized = true;
  }

  /**
   * Called when a component is added to an entity.
   * Data is stored at: components/{componentName}/{id}
   *
   * @param componentDef - The component definition
   * @param id - The entity's stable UUID (from component's `id` field)
   * @param entityId - The runtime entity ID (for bidirectional sync)
   * @param data - The component data (includes `id` field)
   */
  onComponentAdded(
    componentDef: AnyEditorComponentDef,
    id: string,
    entityId: number,
    data: unknown
  ): void {
    // Register UUID -> entityId mapping for locally-created entities
    // This allows flushChanges to find the entity when remote deletions arrive
    if (!this.idToEntityId.has(id)) {
      this.idToEntityId.set(id, entityId);
      this.entityIdToId.set(entityId, id);
    }

    const componentsMap = this.doc.getMap("components");
    let componentMap = componentsMap.get(componentDef.name) as
      | LoroMap
      | undefined;

    if (!componentMap) {
      componentMap = new LoroMap();
      componentsMap.setContainer(componentDef.name, componentMap);
    }
    componentMap.set(id, data);
  }

  /**
   * Called when a component is updated.
   * Data is stored at: components/{componentName}/{id}
   *
   * @param componentDef - The component definition
   * @param id - The entity's stable UUID
   * @param data - The updated component data
   */
  onComponentUpdated(
    componentDef: AnyEditorComponentDef,
    id: string,
    data: unknown
  ): void {
    const componentsMap = this.doc.getMap("components");
    const componentMap = componentsMap.get(componentDef.name) as
      | LoroMap
      | undefined;
    if (componentMap) {
      componentMap.set(id, data);
    }
  }

  /**
   * Called when a component is removed from an entity.
   *
   * @param componentDef - The component definition
   * @param id - The entity's stable UUID
   */
  onComponentRemoved(componentDef: AnyEditorComponentDef, id: string): void {
    const componentsMap = this.doc.getMap("components");
    const componentMap = componentsMap.get(componentDef.name) as
      | LoroMap
      | undefined;
    if (componentMap) {
      componentMap.delete(id);
    }

    // Clean up UUID -> entityId mapping when entity is removed
    const entityId = this.idToEntityId.get(id);
    if (entityId !== undefined) {
      this.idToEntityId.delete(id);
      this.entityIdToId.delete(entityId);
    }
  }

  /**
   * Called when a singleton is updated.
   * Data is stored at: singletons/{singletonName}
   *
   * @param singletonDef - The singleton definition
   * @param data - The singleton data
   */
  onSingletonUpdated(singletonDef: AnyEditorSingletonDef, data: unknown): void {
    const singletonsMap = this.doc.getMap("singletons");
    singletonsMap.set(singletonDef.name, data);
  }

  /**
   * Commit all pending changes to the Loro document.
   */
  commit(): void {
    this.doc.commit({ origin: "editor" });
  }

  /**
   * Flush pending external changes (undo/redo, network sync) to the ECS world.
   * Called by the Editor each frame.
   *
   * Processes cached events from doc.subscribe() that came from external sources
   * (undo/redo, network sync). Local changes are skipped since they already
   * went through the ECS.
   */
  flushChanges(ctx: Context): void {
    if (this.pendingEvents.length === 0) return;

    // Process all cached events in order
    for (const eventBatch of this.pendingEvents) {
      for (const event of eventBatch.events) {
        // Event path tells us the container hierarchy: ["components", "Block", entityId]
        // or ["singletons", "Camera"]
        if (event.diff.type === "map") {
          this.applyEventDiff(ctx, event.path, event.diff);
        }
      }
    }

    // Clear pending events after processing
    this.pendingEvents = [];
  }

  /**
   * Apply a MapDiff from an event to the ECS world.
   * Uses the event path to determine what type of data changed.
   *
   * @param ctx - ECS context
   * @param path - Event path like ["components", "Block"] or ["singletons"]
   * @param diff - The MapDiff containing updated keys
   */
  private applyEventDiff(
    ctx: Context,
    path: (string | number)[],
    diff: MapDiff
  ): void {
    // Path structure:
    // - ["components", componentName] - changes to a component map
    // - ["singletons"] - changes to the singletons map
    if (path.length === 0) return;

    const rootKey = path[0];

    if (rootKey === "components" && path.length >= 2) {
      // This is a component map: path = ["components", componentName]
      const componentName = path[1] as string;
      const componentDef = this.componentDefsByName.get(componentName);
      if (!componentDef) return;

      for (const [id, value] of Object.entries(diff.updated)) {
        if (value === undefined) {
          // Entity was deleted
          const ecsEntityId = this.idToEntityId.get(id);
          if (ecsEntityId !== undefined) {
            removeEntity(ctx, ecsEntityId);
            this.idToEntityId.delete(id);
            this.entityIdToId.delete(ecsEntityId);
          }
        } else {
          // Entity was added or updated
          const existingEntityId = this.idToEntityId.get(id);

          if (existingEntityId !== undefined) {
            // Update existing entity
            if (hasComponent(ctx, existingEntityId, componentDef)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              componentDef.copy(ctx, existingEntityId, value as any);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              addComponent(ctx, existingEntityId, componentDef, value as any);
            }
          } else {
            // Create new entity
            const ecsEntityId = createEntity(ctx);
            this.idToEntityId.set(id, ecsEntityId);
            this.entityIdToId.set(ecsEntityId, id);
            addComponent(ctx, ecsEntityId, componentDef, value as any);
          }
        }
      }
    } else if (rootKey === "singletons") {
      // This is the singletons map: path = ["singletons"]
      for (const [singletonName, value] of Object.entries(diff.updated)) {
        if (value !== undefined) {
          const singletonDef = this.singletonDefsByName.get(singletonName);
          if (singletonDef) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            singletonDef.copy(ctx, value as any);
          }
        }
      }
    }
  }

  /**
   * Undo to the previous state.
   */
  undo(): void {
    if (this.undoManager.canUndo()) {
      this.undoManager.undo();
    }
  }

  /**
   * Redo to the next state.
   */
  redo(): void {
    if (this.undoManager.canRedo()) {
      this.undoManager.redo();
    }
  }

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
  dispose(): void {
    // Disconnect WebSocket
    if (this.client) {
      this.client.close();
      this.client = null;
    }

    // Close IndexedDB
    this.localDB?.close();

    this.initialized = false;
  }
}
