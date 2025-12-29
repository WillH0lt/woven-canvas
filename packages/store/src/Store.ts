import {
  LoroDoc,
  LoroMap,
  UndoManager,
  EphemeralStore,
  type LoroEventBatch,
  type MapDiff,
  type EphemeralStoreEvent,
  type Value,
} from "loro-crdt";
import { LoroWebsocketClient } from "loro-websocket";
import { LoroAdaptor, LoroEphemeralAdaptor } from "loro-adaptors/loro";
import { throttle } from "lodash-es";
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
  documentId: string;
  websocketUrl?: string;
  useLocalPersistence?: boolean;
  useWebSocket?: boolean;
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
 *   documentId: "my-document",
 *   useLocalPersistence: true, // optional
 *   useWebSocket: true,  // optional
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
  private ephemeralStore: EphemeralStore;

  // Persistence
  private localDB?: LocalDB;

  // Network
  private client: LoroWebsocketClient | null = null;
  private adaptor: LoroAdaptor | null = null;
  private ephemeralAdaptor: LoroEphemeralAdaptor | null = null;
  private websocketUrl?: string;
  private documentId: string;

  private initialized: boolean = false;

  // Bidirectional sync state for document-synced components
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
  /** Cached ephemeral events from remote peers */
  private pendingEphemeralEvents: EphemeralStoreEvent[] = [];

  constructor(options: StoreOptions = { documentId: "default" }) {
    this.documentId = options.documentId;
    this.websocketUrl = options.websocketUrl;

    if (options.useLocalPersistence) {
      this.localDB = new LocalDB(options.documentId);
    }

    this.doc = new LoroDoc();
    this.undoManager = new UndoManager(this.doc, {
      excludeOriginPrefixes: ["sys:"],
    });
    this.ephemeralStore = new EphemeralStore();
  }

  /**
   * Initialize the store with component/singleton definitions.
   * Loads from IndexedDB and connects to WebSocket if configured.
   *
   * Called by the Editor during initialization to set up bidirectional sync.
   * Partitions components by their sync type internally.
   *
   * @param components - Array of all synced component definitions
   * @param singletons - Array of all synced singleton definitions
   */
  async initialize(
    components: AnyEditorComponentDef[],
    singletons: AnyEditorSingletonDef[]
  ): Promise<void> {
    if (this.initialized) return;

    // Build name -> def maps
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

    // Subscribe to ephemeral store changes from remote peers
    this.ephemeralStore.subscribe((event: EphemeralStoreEvent) => {
      // Cache external ephemeral events for flushChanges
      if (event.by !== "local") {
        this.pendingEphemeralEvents.push(event);
      }
    });

    // Initialize local persistence and load document
    if (this.localDB) {
      await this.localDB.initialize();
      await this.localDB.loadIntoDoc(this.doc);
    }

    // Connect to WebSocket if configured
    if (this.websocketUrl) {
      this.adaptor = new LoroAdaptor(this.doc);
      this.ephemeralAdaptor = new LoroEphemeralAdaptor(this.ephemeralStore);
      this.client = new LoroWebsocketClient({ url: this.websocketUrl });

      this.client.waitConnected().then(async () => {
        if (!this.client || !this.adaptor || !this.ephemeralAdaptor) return;

        return Promise.all([
          this.client.join({
            roomId: this.documentId,
            crdtAdaptor: this.adaptor,
          }),
          this.client.join({
            roomId: this.documentId,
            crdtAdaptor: this.ephemeralAdaptor,
          }),
        ]);
      });
    }

    this.initialized = true;
  }

  /**
   * Called when a component is added to an entity.
   * Routes to document or ephemeral storage based on sync type.
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

    if (componentDef.__editor.sync === "document") {
      // Store in Loro document for persistence
      const componentsMap = this.doc.getMap("components");
      let componentMap = componentsMap.get(componentDef.name) as
        | LoroMap
        | undefined;

      if (!componentMap) {
        componentMap = new LoroMap();
        componentsMap.setContainer(componentDef.name, componentMap);
      }
      componentMap.set(id, data);
    } else if (componentDef.__editor.sync === "ephemeral") {
      // Store in EphemeralStore for transient sync
      const key = `${componentDef.name}:${id}`;
      this.ephemeralStore.set(key, data as Value);
    }
  }

  /**
   * Called when a component is updated.
   * Routes to document or ephemeral storage based on sync type.
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
    if (componentDef.__editor.sync === "document") {
      const componentsMap = this.doc.getMap("components");
      const componentMap = componentsMap.get(componentDef.name) as
        | LoroMap
        | undefined;
      if (componentMap) {
        componentMap.set(id, data);
      }
    } else if (componentDef.__editor.sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.ephemeralStore.set(key, data as Value);
    }
  }

  /**
   * Called when a component is removed from an entity.
   * Routes to document or ephemeral storage based on sync type.
   *
   * @param componentDef - The component definition
   * @param id - The entity's stable UUID
   */
  onComponentRemoved(componentDef: AnyEditorComponentDef, id: string): void {
    if (componentDef.__editor.sync === "document") {
      const componentsMap = this.doc.getMap("components");
      const componentMap = componentsMap.get(componentDef.name) as
        | LoroMap
        | undefined;
      if (componentMap) {
        componentMap.delete(id);
      }
    } else if (componentDef.__editor.sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.ephemeralStore.delete(key);
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
   * Routes to document or ephemeral storage based on sync type.
   *
   * @param singletonDef - The singleton definition
   * @param data - The singleton data
   */
  onSingletonUpdated(singletonDef: AnyEditorSingletonDef, data: unknown): void {
    if (singletonDef.__editor.sync === "document") {
      const singletonsMap = this.doc.getMap("singletons");
      singletonsMap.set(singletonDef.name, data);
    } else if (singletonDef.__editor.sync === "ephemeral") {
      const key = `singleton:${singletonDef.name}`;
      this.ephemeralStore.set(key, data as Value);
    }
  }

  /**
   * Commit all pending changes to the Loro document.
   * Throttled to run at most once every 250ms.
   */
  commit: ReturnType<typeof throttle> = throttle(() => {
    this.doc.commit({ origin: "editor" });
  }, 250);

  /**
   * Flush pending external changes (undo/redo, network sync) to the ECS world.
   * Called by the Editor each frame.
   *
   * Processes cached events from doc.subscribe() that came from external sources
   * (undo/redo, network sync). Local changes are skipped since they already
   * went through the ECS.
   */
  flushChanges(ctx: Context): void {
    // Process document events
    if (this.pendingEvents.length > 0) {
      for (const eventBatch of this.pendingEvents) {
        for (const event of eventBatch.events) {
          // Event path tells us the container hierarchy: ["components", "Block", entityId]
          // or ["singletons", "Camera"]
          if (event.diff.type === "map") {
            this.applyDocumentEvent(ctx, event.path, event.diff);
          }
        }
      }
      this.pendingEvents = [];
    }

    // Process ephemeral events
    if (this.pendingEphemeralEvents.length > 0) {
      for (const event of this.pendingEphemeralEvents) {
        this.applyEphemeralEvent(ctx, event);
      }
      this.pendingEphemeralEvents = [];
    }
  }

  // ─── Helpers for applying external changes to ECS ───────────────────────────

  /**
   * Add a component to an entity, creating the entity if it doesn't exist.
   */
  private addComponentToEntity(
    ctx: Context,
    componentName: string,
    id: string,
    value: unknown
  ): void {
    const componentDef = this.componentDefsByName.get(componentName);
    if (!componentDef) return;

    const existingEntityId = this.idToEntityId.get(id);
    if (existingEntityId !== undefined) {
      // Entity exists - add or update component
      if (hasComponent(ctx, existingEntityId, componentDef)) {
        componentDef.copy(ctx, existingEntityId, value as any);
      } else {
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

  /**
   * Update a component on an existing entity.
   */
  private updateComponentOnEntity(
    ctx: Context,
    componentName: string,
    id: string,
    value: unknown
  ): void {
    const componentDef = this.componentDefsByName.get(componentName);
    if (!componentDef) return;

    const existingEntityId = this.idToEntityId.get(id);
    if (existingEntityId !== undefined) {
      if (hasComponent(ctx, existingEntityId, componentDef)) {
        componentDef.copy(ctx, existingEntityId, value as any);
      } else {
        addComponent(ctx, existingEntityId, componentDef, value as any);
      }
    }
  }

  /**
   * Remove an entity by its stable ID.
   */
  private removeEntityById(ctx: Context, id: string): void {
    const ecsEntityId = this.idToEntityId.get(id);
    if (ecsEntityId !== undefined) {
      removeEntity(ctx, ecsEntityId);
      this.idToEntityId.delete(id);
      this.entityIdToId.delete(ecsEntityId);
    }
  }

  /**
   * Update a singleton's data.
   */
  private updateSingleton(
    ctx: Context,
    singletonName: string,
    value: unknown
  ): void {
    const singletonDef = this.singletonDefsByName.get(singletonName);
    if (singletonDef) {
      singletonDef.copy(ctx, value as any);
    }
  }

  // ─── Event processing ──────────────────────────────────────────────────────

  /**
   * Apply an ephemeral event to the ECS world.
   * Keys are formatted as "{componentName}:{id}" or "singleton:{singletonName}"
   */
  private applyEphemeralEvent(ctx: Context, event: EphemeralStoreEvent): void {
    // Process added keys
    for (const key of event.added) {
      const value = this.ephemeralStore.get(key);
      if (value === undefined) continue;

      if (key.startsWith("singleton:")) {
        this.updateSingleton(ctx, key.slice("singleton:".length), value);
      } else {
        const colonIndex = key.indexOf(":");
        if (colonIndex === -1) continue;
        this.addComponentToEntity(
          ctx,
          key.slice(0, colonIndex),
          key.slice(colonIndex + 1),
          value
        );
      }
    }

    // Process updated keys
    for (const key of event.updated) {
      const value = this.ephemeralStore.get(key);
      if (value === undefined) continue;

      if (key.startsWith("singleton:")) {
        this.updateSingleton(ctx, key.slice("singleton:".length), value);
      } else {
        const colonIndex = key.indexOf(":");
        if (colonIndex === -1) continue;
        this.updateComponentOnEntity(
          ctx,
          key.slice(0, colonIndex),
          key.slice(colonIndex + 1),
          value
        );
      }
    }

    // Process removed keys (timeout or explicit deletion)
    for (const key of event.removed) {
      if (key.startsWith("singleton:")) continue; // Singletons don't get removed

      const colonIndex = key.indexOf(":");
      if (colonIndex === -1) continue;
      this.removeEntityById(ctx, key.slice(colonIndex + 1));
    }
  }

  /**
   * Apply a MapDiff from an event to the ECS world.
   * Uses the event path to determine what type of data changed.
   *
   * @param ctx - ECS context
   * @param path - Event path like ["components", "Block"] or ["singletons"]
   * @param diff - The MapDiff containing updated keys
   */
  private applyDocumentEvent(
    ctx: Context,
    path: (string | number)[],
    diff: MapDiff
  ): void {
    if (path.length === 0) return;

    const rootKey = path[0];

    if (rootKey === "components" && path.length >= 2) {
      const componentName = path[1] as string;

      for (const [id, value] of Object.entries(diff.updated)) {
        if (value === undefined) {
          this.removeEntityById(ctx, id);
        } else {
          this.addComponentToEntity(ctx, componentName, id, value);
        }
      }
    } else if (rootKey === "singletons") {
      for (const [singletonName, value] of Object.entries(diff.updated)) {
        if (value !== undefined) {
          this.updateSingleton(ctx, singletonName, value);
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
    this.localDB?.dispose();

    this.commit.cancel();

    this.initialized = false;
  }
}
