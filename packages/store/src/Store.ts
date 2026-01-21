import {
  LoroDoc,
  LoroMap,
  UndoManager,
  EphemeralStore,
  type LoroEventBatch,
  type EphemeralStoreEvent,
  type Value,
} from "loro-crdt";
import { LoroWebsocketClient } from "loro-websocket";
import { LoroAdaptor, LoroEphemeralAdaptor } from "loro-adaptors/loro";
import { throttle } from "lodash-es";
import {
  createEntity,
  addComponent,
  removeComponent,
  removeEntity,
  hasComponent,
  Synced,
  isAlive,
  type Context,
  type StoreAdapter,
  type AnyEditorComponentDef,
  type AnyEditorSingletonDef,
  type ComponentSchema,
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
  ephemeralTimeoutMs?: number;
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
  private ephemeralTimeoutMs: number;
  private documentId: string;

  // Ephemeral data refresh
  private localEphemeralKeys: Set<string> = new Set();
  private ephemeralRefreshInterval: ReturnType<typeof setInterval> | null =
    null;

  private initialized: boolean = false;

  // Beforeunload handler reference for cleanup
  private beforeUnload: (() => void) | null = null;

  // Bidirectional sync state for document-synced components
  /** Map of component name -> component def for applying changes */
  private componentDefsByName: Map<string, AnyEditorComponentDef> = new Map();
  /** Map of singleton name -> singleton def for applying changes */
  private singletonDefsByName: Map<string, AnyEditorSingletonDef> = new Map();
  /** Map of _id -> entityId for tracking entities we've created */
  private idToEntityId: Map<string, number> = new Map();
  /** Map of entityId -> _id for reverse lookup */
  private entityIdToId: Map<number, string> = new Map();
  /** Map of entityId -> set of synced component names for cleanup tracking */
  private entityIdToSyncedComponents: Map<number, Set<string>> = new Map();
  /** Cached events from external changes (undo/redo, network sync) */
  private pendingEvents: LoroEventBatch[] = [];
  /** Cached ephemeral events from remote peers */
  private pendingEphemeralEvents: EphemeralStoreEvent[] = [];

  constructor(options: StoreOptions = { documentId: "default" }) {
    this.documentId = options.documentId;
    this.websocketUrl = options.websocketUrl;
    this.ephemeralTimeoutMs = options.ephemeralTimeoutMs ?? 10000;

    if (options.useLocalPersistence) {
      this.localDB = new LocalDB(options.documentId);
    }

    this.doc = new LoroDoc();
    this.undoManager = new UndoManager(this.doc, {
      excludeOriginPrefixes: ["sys:"],
    });
    this.ephemeralStore = new EphemeralStore(this.ephemeralTimeoutMs);
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
    singletons: AnyEditorSingletonDef[],
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

      // Cache external events (load, undo/redo, network sync) for flushChanges
      // Skip local edits since they already went through the ECS:
      // - "editor" origin: our explicit commits
      // - empty origin + local: auto-commits from UndoManager checkpoints
      // Process everything else: imports (load, network), undo/redo
      const isLocalEdit =
        event.by === "local" &&
        (event.origin === "editor" || event.origin === "");
      if (!isLocalEdit) {
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

    // Start ephemeral data refresh to keep local data alive
    this.startEphemeralRefresh();

    // Register beforeunload handler to flush pending saves
    if (typeof window !== "undefined") {
      this.beforeUnload = () => {
        this.commit.flush();
        this.localDB?.saveDoc.flush();
      };
      window.addEventListener("beforeunload", this.beforeUnload);
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
    data: Record<string, unknown>,
  ): void {
    // Register UUID -> entityId mapping for locally-created entities
    // This allows flushChanges to find the entity when remote deletions arrive
    if (!this.idToEntityId.has(id)) {
      this.idToEntityId.set(id, entityId);
      this.entityIdToId.set(entityId, id);
    }

    // Track which synced components this entity has for cleanup
    let components = this.entityIdToSyncedComponents.get(entityId);
    if (!components) {
      components = new Set();
      this.entityIdToSyncedComponents.set(entityId, components);
    }
    components.add(componentDef.name);

    // Translate refs from entityIds to syncedIds before storing
    const translatedData = this.translateRefsOutbound(componentDef, data);

    if (componentDef.__editor.sync === "document") {
      // Store in Loro document for persistence
      const componentsMap = this.doc.getMap("components");
      let componentMap = componentsMap.get(componentDef.name) as
        | LoroMap
        | undefined;

      if (!componentMap) {
        const newMap = new LoroMap();
        componentsMap.setContainer(componentDef.name, newMap);
        // After setContainer, we must get the attached map from the parent
        // The local newMap reference is no longer connected to the document
        componentMap = componentsMap.get(componentDef.name) as LoroMap;
      }
      componentMap.set(id, translatedData);
    } else if (componentDef.__editor.sync === "ephemeral") {
      // Store in EphemeralStore for transient sync
      const key = `${componentDef.name}:${id}`;
      this.ephemeralStore.set(key, translatedData as Value);
      this.localEphemeralKeys.add(key);
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
    data: Record<string, unknown>,
  ): void {
    // Translate refs from entityIds to syncedIds before storing
    const translatedData = this.translateRefsOutbound(componentDef, data);

    if (componentDef.__editor.sync === "document") {
      const componentsMap = this.doc.getMap("components");
      const componentMap = componentsMap.get(componentDef.name) as
        | LoroMap
        | undefined;
      if (componentMap) {
        componentMap.set(id, translatedData);
      }
    } else if (componentDef.__editor.sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.ephemeralStore.set(key, translatedData as Value);
      this.localEphemeralKeys.add(key);
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
      this.localEphemeralKeys.delete(key);
    }

    // Clean up UUID -> entityId mapping when entity has no more synced components
    const entityId = this.idToEntityId.get(id);
    if (entityId !== undefined) {
      const components = this.entityIdToSyncedComponents.get(entityId);
      if (components) {
        components.delete(componentDef.name);
        if (components.size === 0) {
          this.entityIdToSyncedComponents.delete(entityId);
          this.idToEntityId.delete(id);
          this.entityIdToId.delete(entityId);
        }
      }
    }
  }

  /**
   * Called when a singleton is updated.
   * Singletons are always stored in the document for persistence.
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
   * Throttled to run at most once every 250ms.
   */
  commit: ReturnType<typeof throttle> = throttle(() => {
    this.doc.commit({ origin: "editor" });
  }, 250);

  /**
   * Refresh all local ephemeral data to prevent timeout expiration.
   * Re-sets each key with its current value to reset the TTL.
   */
  private refreshEphemeralData(): void {
    for (const key of this.localEphemeralKeys) {
      const value = this.ephemeralStore.get(key);
      if (value !== undefined) {
        this.ephemeralStore.set(key, value);
      } else {
        // Value already expired, remove from tracking
        this.localEphemeralKeys.delete(key);
      }
    }
  }

  /**
   * Start the ephemeral data refresh interval.
   * Refreshes at half the timeout period to ensure data stays alive.
   */
  private startEphemeralRefresh(): void {
    if (this.ephemeralRefreshInterval) return;

    // Refresh at half the timeout to ensure data doesn't expire
    const refreshMs = Math.max(1000, this.ephemeralTimeoutMs / 2);
    this.ephemeralRefreshInterval = setInterval(() => {
      this.refreshEphemeralData();
    }, refreshMs);
  }

  /**
   * Stop the ephemeral data refresh interval.
   */
  private stopEphemeralRefresh(): void {
    if (this.ephemeralRefreshInterval) {
      clearInterval(this.ephemeralRefreshInterval);
      this.ephemeralRefreshInterval = null;
    }
  }

  /**
   * Flush pending external changes (undo/redo, network sync) to the ECS world.
   * Called by the Editor each frame.
   *
   * Uses a two-pass approach to handle ref fields:
   * 1. First pass: Create entities and register syncedId -> entityId mappings
   * 2. Second pass: Apply component data with refs now resolvable
   *
   * Processes cached events from doc.subscribe() that came from external sources
   * (undo/redo, network sync). Local changes are skipped since they already
   * went through the ECS.
   */
  flushChanges(ctx: Context): void {
    // Process document events with two-pass approach
    if (this.pendingEvents.length > 0) {
      // Collect all component changes for two-pass processing
      const componentChanges: Array<{
        componentName: string;
        id: string;
        value: unknown;
      }> = [];
      const componentRemovals: Array<{
        componentName: string;
        id: string;
      }> = [];
      const singletonChanges: Array<{
        singletonName: string;
        value: unknown;
      }> = [];

      // Parse events and collect changes
      for (const eventBatch of this.pendingEvents) {
        for (const event of eventBatch.events) {
          if (event.diff.type !== "map") continue;

          const path = event.path;
          if (path.length === 0) continue;

          const rootKey = path[0];
          const diff = event.diff;

          if (rootKey === "components" && path.length >= 2) {
            const componentName = path[1] as string;
            for (const [id, value] of Object.entries(diff.updated)) {
              if (value === undefined) {
                componentRemovals.push({ componentName, id });
              } else {
                componentChanges.push({ componentName, id, value });
              }
            }
          } else if (rootKey === "singletons") {
            for (const [singletonName, value] of Object.entries(diff.updated)) {
              if (value !== undefined) {
                singletonChanges.push({ singletonName, value });
              }
            }
          }
        }
      }
      this.pendingEvents = [];

      // Pass 1: Create entities and register mappings (no component data yet)
      for (const { id } of componentChanges) {
        if (!this.idToEntityId.has(id)) {
          const ecsEntityId = createEntity(ctx);
          this.idToEntityId.set(id, ecsEntityId);
          this.entityIdToId.set(ecsEntityId, id);
          addComponent(ctx, ecsEntityId, Synced, { id });
        }
      }

      // Pass 2: Apply component data (refs can now resolve)
      for (const { componentName, id, value } of componentChanges) {
        const componentDef = this.componentDefsByName.get(componentName);
        if (!componentDef) continue;

        const entityId = this.idToEntityId.get(id)!;
        if (!isAlive(ctx, entityId)) continue;

        const translatedValue = this.translateRefsInbound(
          componentDef,
          value as Record<string, unknown>,
        );

        if (hasComponent(ctx, entityId, componentDef)) {
          componentDef.copy(ctx, entityId, translatedValue as any);
        } else {
          addComponent(ctx, entityId, componentDef, translatedValue as any);
        }

        // Manually track synced components added by flushChanges
        // (onComponentAdded may not be called for store-initiated adds)
        let components = this.entityIdToSyncedComponents.get(entityId);
        if (!components) {
          components = new Set();
          this.entityIdToSyncedComponents.set(entityId, components);
        }
        components.add(componentName);
      }

      // Process removals
      for (const { componentName, id } of componentRemovals) {
        this.removeComponentFromEntity(ctx, componentName, id);
      }

      // Process singleton changes
      for (const { singletonName, value } of singletonChanges) {
        this.updateSingleton(ctx, singletonName, value);
      }
    }

    // Process ephemeral events
    if (this.pendingEphemeralEvents.length > 0) {
      for (const event of this.pendingEphemeralEvents) {
        this.applyEphemeralEvent(ctx, event);
      }
      this.pendingEphemeralEvents = [];
    }
  }

  // ─── Ref Translation ─────────────────────────────────────────────────────────

  /**
   * Translate ref fields from entityIds to syncedIds for outbound storage.
   * Returns a new object with refs converted to UUIDs (or null if not synced).
   */
  private translateRefsOutbound(
    componentDef: AnyEditorComponentDef,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const schema = componentDef.schema as ComponentSchema;
    let hasRefs = false;

    // Quick check if any ref fields exist
    for (const fieldName in schema) {
      if (schema[fieldName].def.type === "ref") {
        hasRefs = true;
        break;
      }
    }

    if (!hasRefs) return data;

    const result = { ...data };
    for (const fieldName in schema) {
      const fieldDef = schema[fieldName].def;
      if (fieldDef.type === "ref" && result[fieldName] !== null) {
        const entityId = result[fieldName] as number;
        const syncedId = this.entityIdToId.get(entityId);
        // Convert to syncedId, or null if the referenced entity isn't synced
        result[fieldName] = syncedId ?? null;
      }
    }
    return result;
  }

  /**
   * Translate ref fields from syncedIds to entityIds for inbound data.
   * Returns a new object with refs converted to entityIds (or null if not found).
   */
  private translateRefsInbound(
    componentDef: AnyEditorComponentDef,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const schema = componentDef.schema as ComponentSchema;
    let hasRefs = false;

    // Quick check if any ref fields exist
    for (const fieldName in schema) {
      if (schema[fieldName].def.type === "ref") {
        hasRefs = true;
        break;
      }
    }

    if (!hasRefs) return data;

    const result = { ...data };
    for (const fieldName in schema) {
      const fieldDef = schema[fieldName].def;
      if (fieldDef.type === "ref" && result[fieldName] !== null) {
        const syncedId = result[fieldName] as string;
        const entityId = this.idToEntityId.get(syncedId);
        // Convert to entityId, or null if not found
        result[fieldName] = entityId ?? null;
      }
    }

    return result;
  }

  // ─── Helpers for applying external changes to ECS ───────────────────────────

  /**
   * Add a component to an entity, creating the entity if it doesn't exist.
   * Translates ref fields from syncedIds to entityIds.
   */
  private addComponentToEntity(
    ctx: Context,
    componentName: string,
    id: string,
    value: Record<string, unknown>,
  ): void {
    const componentDef = this.componentDefsByName.get(componentName);
    if (!componentDef) return;

    const existingEntityId = this.idToEntityId.get(id);
    if (existingEntityId !== undefined && isAlive(ctx, existingEntityId)) {
      // Entity exists - add or update component
      const translatedValue = this.translateRefsInbound(componentDef, value);
      if (hasComponent(ctx, existingEntityId, componentDef)) {
        componentDef.copy(ctx, existingEntityId, translatedValue as any);
      } else {
        addComponent(
          ctx,
          existingEntityId,
          componentDef,
          translatedValue as any,
        );
      }
    } else {
      // Create new entity
      const ecsEntityId = createEntity(ctx);
      this.idToEntityId.set(id, ecsEntityId);
      this.entityIdToId.set(ecsEntityId, id);
      // Add Synced component with the entity's stable ID
      addComponent(ctx, ecsEntityId, Synced, { id });
      // Translate refs after entity is registered
      const translatedValue = this.translateRefsInbound(
        componentDef,
        value as Record<string, unknown>,
      );
      addComponent(ctx, ecsEntityId, componentDef, translatedValue as any);
    }
  }

  /**
   * Update a component on an existing entity.
   * Translates ref fields from syncedIds to entityIds.
   */
  private updateComponentOnEntity(
    ctx: Context,
    componentName: string,
    id: string,
    value: Record<string, unknown>,
  ): void {
    const componentDef = this.componentDefsByName.get(componentName);
    if (!componentDef) return;

    const existingEntityId = this.idToEntityId.get(id);
    if (existingEntityId !== undefined && isAlive(ctx, existingEntityId)) {
      const translatedValue = this.translateRefsInbound(componentDef, value);
      if (hasComponent(ctx, existingEntityId, componentDef)) {
        componentDef.copy(ctx, existingEntityId, translatedValue as any);
      } else {
        addComponent(
          ctx,
          existingEntityId,
          componentDef,
          translatedValue as any,
        );
      }
    }
  }

  /**
   * Remove a component from an entity by its stable ID.
   * If the entity only has the Synced component remaining after removal,
   * the entity is deleted entirely.
   */
  private removeComponentFromEntity(
    ctx: Context,
    componentName: string,
    id: string,
  ): void {
    const componentDef = this.componentDefsByName.get(componentName);
    if (!componentDef) return;

    const entityId = this.idToEntityId.get(id);
    if (
      entityId !== undefined &&
      isAlive(ctx, entityId) &&
      hasComponent(ctx, entityId, componentDef)
    ) {
      removeComponent(ctx, entityId, componentDef);

      // Check if only Synced remains - if so, clean up the entity
      const syncedId = Synced._getComponentId(ctx);
      let hasOtherComponents = false;
      for (const compId of ctx.entityBuffer.getComponentIds(entityId)) {
        if (compId !== syncedId) {
          hasOtherComponents = true;
          break;
        }
      }

      if (!hasOtherComponents) {
        removeEntity(ctx, entityId);
        this.idToEntityId.delete(id);
        this.entityIdToId.delete(entityId);
      }
    }
  }

  /**
   * Update a singleton's data.
   */
  private updateSingleton(
    ctx: Context,
    singletonName: string,
    value: unknown,
  ): void {
    const singletonDef = this.singletonDefsByName.get(singletonName);
    if (singletonDef) {
      singletonDef.copy(ctx, value as any);
    }
  }

  // ─── Event processing ──────────────────────────────────────────────────────

  /**
   * Apply an ephemeral event to the ECS world.
   * Keys are formatted as "{componentName}:{id}"
   */
  private applyEphemeralEvent(ctx: Context, event: EphemeralStoreEvent): void {
    // Process added keys
    for (const key of event.added) {
      const value = this.ephemeralStore.get(key);
      if (value === undefined) continue;

      const colonIndex = key.indexOf(":");
      if (colonIndex === -1) continue;
      this.addComponentToEntity(
        ctx,
        key.slice(0, colonIndex),
        key.slice(colonIndex + 1),
        value as Record<string, unknown>,
      );
    }

    // Process updated keys
    for (const key of event.updated) {
      const value = this.ephemeralStore.get(key);
      if (value === undefined) continue;

      const colonIndex = key.indexOf(":");
      if (colonIndex === -1) continue;
      this.updateComponentOnEntity(
        ctx,
        key.slice(0, colonIndex),
        key.slice(colonIndex + 1),
        value as Record<string, unknown>,
      );
    }

    // Process removed keys (timeout or explicit deletion)
    for (const key of event.removed) {
      const colonIndex = key.indexOf(":");
      if (colonIndex === -1) continue;
      this.removeComponentFromEntity(
        ctx,
        key.slice(0, colonIndex),
        key.slice(colonIndex + 1),
      );
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
    // Remove beforeunload handler
    if (this.beforeUnload && typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnload);
      this.beforeUnload = null;
    }

    // Stop ephemeral refresh interval
    this.stopEphemeralRefresh();

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
