import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as awarenessProtocol from "y-protocols/awareness";
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
  type BlockDef,
} from "@infinitecanvas/editor";

/**
 * Options for configuring the YjsStore.
 */
export interface YjsStoreOptions {
  /** Unique identifier for the document (used for IndexedDB storage and room name) */
  documentId: string;
  /** Time in ms of inactivity before creating an undo checkpoint (default: 1000) */
  captureTimeout?: number;
  /** WebSocket server URL for multiplayer (e.g., "wss://myserver.com"). If not provided, multiplayer is disabled. */
  websocketUrl?: string;
  /** Time in ms before ephemeral data expires (default: 10000). Used for presence/cursor sync. */
  ephemeralTimeoutMs?: number;
  /** Whether to start in online mode (default: true if websocketUrl is provided). Set to false for offline-first testing. */
  startOnline?: boolean;
}

/**
 * YjsStore - A StoreAdapter using Yjs CRDT for local-first persistence and multiplayer.
 *
 * Features:
 * - Local persistence via IndexedDB (y-indexeddb)
 * - Real-time multiplayer via WebSocket (y-websocket)
 * - Undo/redo via Yjs UndoManager with configurable capture timeout
 * - Automatic CRDT conflict resolution
 *
 * @example
 * ```typescript
 * // Local-only mode
 * const store = new YjsStore({
 *   documentId: "my-document",
 *   captureTimeout: 1000,
 * });
 *
 * // With multiplayer
 * const store = new YjsStore({
 *   documentId: "my-document",
 *   websocketUrl: "wss://myserver.com",
 * });
 *
 * const editor = new Editor(container, {
 *   store,
 *   plugins: [...],
 * });
 * ```
 */
export class YjsStore implements StoreAdapter {
  private doc: Y.Doc;
  private persistence: IndexeddbPersistence | null = null;
  private websocketProvider: WebsocketProvider | null = null;
  private awareness: awarenessProtocol.Awareness;
  private undoManager: Y.UndoManager | null = null;
  private documentId: string;
  private captureTimeout: number;
  private websocketUrl: string | undefined;
  private ephemeralTimeoutMs: number;
  private startOnline: boolean;

  private initialized: boolean = false;

  // Bidirectional sync state for document-synced components
  private componentDefsByName: Map<string, AnyEditorComponentDef> = new Map();
  private singletonDefsByName: Map<string, AnyEditorSingletonDef> = new Map();
  private idToEntityId: Map<string, number> = new Map();
  private entityIdToId: Map<number, string> = new Map();
  private entityIdToSyncedComponents: Map<number, Set<string>> = new Map();

  // Map of block tag -> required component names for entity validation
  private blockRequiredComponents: Map<string, string[]> = new Map();

  // Ephemeral data tracking (for presence/cursor sync via awareness)
  private localEphemeralKeys: Set<string> = new Set();
  /** Pending local ephemeral updates to batch before sending */
  private pendingLocalEphemeral: Map<string, Record<string, unknown> | null> =
    new Map();
  private ephemeralRefreshInterval: ReturnType<typeof setInterval> | null =
    null;

  // Pending changes from external sources (undo/redo, network, awareness)
  private pendingChanges: Array<
    | {
        type: "component";
        action: "set" | "remove";
        componentName: string;
        id: string;
        value?: Record<string, unknown>;
      }
    | {
        type: "singleton";
        singletonName: string;
        value: unknown;
      }
  > = [];

  constructor(options: YjsStoreOptions) {
    this.documentId = options.documentId;
    this.captureTimeout = options.captureTimeout ?? 1000;
    this.websocketUrl = options.websocketUrl;
    this.ephemeralTimeoutMs = options.ephemeralTimeoutMs ?? 10000;
    this.startOnline = options.startOnline ?? true;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
  }

  /**
   * Initialize the store with component/singleton definitions.
   * Loads from IndexedDB and sets up change observers.
   *
   * @param components - Component definitions to sync
   * @param singletons - Singleton definitions to sync
   * @param blockDefs - Block type definitions for entity validation.
   *   Each defines required components for a valid block type.
   *   Used to clean up orphaned entities after CRDT sync conflicts.
   */
  async initialize(
    components: AnyEditorComponentDef[],
    singletons: AnyEditorSingletonDef[],
    blockDefs: BlockDef[],
  ): Promise<void> {
    if (this.initialized) return;

    // Build map of block tag -> required component names for entity validation
    for (const blockDef of blockDefs) {
      const componentNames = blockDef.components.map((c) => c.name);
      this.blockRequiredComponents.set(blockDef.tag, componentNames);
    }

    // Build name -> def maps
    for (const componentDef of components) {
      this.componentDefsByName.set(componentDef.name, componentDef);
    }
    for (const singletonDef of singletons) {
      this.singletonDefsByName.set(singletonDef.name, singletonDef);
    }

    // Initialize IndexedDB persistence
    this.persistence = new IndexeddbPersistence(this.documentId, this.doc);
    await this.persistence.whenSynced;

    // Queue all existing data from IndexedDB for the first flushChanges
    this.queueFullDocumentState();

    // Initialize WebSocket provider for multiplayer (if configured and startOnline is true)
    if (this.websocketUrl && this.startOnline) {
      this.websocketProvider = new WebsocketProvider(
        this.websocketUrl,
        this.documentId,
        this.doc,
        { awareness: this.awareness },
      );
    }

    // Subscribe to awareness changes for ephemeral sync
    this.awareness.on(
      "change",
      (changes: { added: number[]; updated: number[]; removed: number[] }) => {
        // queueAwarenessChanges skips local client internally
        this.queueAwarenessChanges(changes);
      },
    );

    // Start ephemeral data refresh to keep local data alive
    this.startEphemeralRefresh();

    // Get the root maps that will be tracked by UndoManager
    const componentsMap = this.doc.getMap("components");
    const singletonsMap = this.doc.getMap("singletons");

    // Initialize UndoManager to track both maps
    // captureTimeout groups rapid changes into single undo steps
    this.undoManager = new Y.UndoManager([componentsMap, singletonsMap], {
      captureTimeout: this.captureTimeout,
    });

    // Subscribe to doc changes for external events (undo/redo, network sync)
    this.doc.on(
      "update",
      (
        _update: Uint8Array,
        origin: unknown,
        _doc: Y.Doc,
        transaction: Y.Transaction,
      ) => {
        // Skip local edits - they already went through ECS
        // Local edits have origin === null (from direct mutations)
        if (origin === null) return;

        // Handle undo/redo changes
        if (origin === this.undoManager) {
          this.queueChangesFromTransaction(transaction);
          return;
        }

        // Handle remote changes from WebSocket
        if (origin === this.websocketProvider) {
          this.queueChangesFromTransaction(transaction);
          return;
        }
      },
    );

    this.initialized = true;
  }

  /**
   * Queue all existing document state for flushChanges.
   * Called after loading from IndexedDB to populate the ECS.
   */
  private queueFullDocumentState(): void {
    const componentsMap = this.doc.getMap("components");
    const singletonsMap = this.doc.getMap("singletons");

    // Queue all components
    componentsMap.forEach((componentMap, componentName) => {
      if (componentMap instanceof Y.Map) {
        componentMap.forEach((value, id) => {
          this.pendingChanges.push({
            type: "component",
            action: "set",
            componentName,
            id,
            value: value as Record<string, unknown>,
          });
        });
      }
    });

    // Queue all singletons
    singletonsMap.forEach((value, singletonName) => {
      this.pendingChanges.push({
        type: "singleton",
        singletonName,
        value,
      });
    });
  }

  /**
   * Queue changes from a Yjs transaction for flushChanges.
   * Called when undo/redo or external updates arrive.
   */
  private queueChangesFromTransaction(transaction: Y.Transaction): void {
    const componentsMap = this.doc.getMap("components");
    const singletonsMap = this.doc.getMap("singletons");

    // Process changed keys in components map
    for (const [changedType, changedKeys] of transaction.changed) {
      // Cast to unknown for comparison since AbstractType and YMap types don't overlap in TS
      const changedTypeRef = changedType as unknown;

      // Check if root components map changed
      if (changedTypeRef === componentsMap) {
        // Root components map changed - a component type was added/removed
        for (const componentName of changedKeys) {
          if (componentName === null) continue;
          const componentMap = componentsMap.get(componentName);
          if (componentMap instanceof Y.Map) {
            // Component type exists - queue all its entries
            componentMap.forEach((value, id) => {
              this.pendingChanges.push({
                type: "component",
                action: "set",
                componentName,
                id,
                value: value as Record<string, unknown>,
              });
            });
          }
        }
      } else if (changedTypeRef === singletonsMap) {
        // Singletons map changed
        for (const singletonName of changedKeys) {
          if (singletonName === null) continue;
          const value = singletonsMap.get(singletonName);
          if (value !== undefined) {
            this.pendingChanges.push({
              type: "singleton",
              singletonName,
              value,
            });
          }
        }
      } else if (changedType instanceof Y.Map) {
        // A nested component map changed - find which one
        const componentName = this.findComponentNameForMap(changedType);
        if (componentName) {
          for (const id of changedKeys) {
            if (id === null) continue;
            const value = changedType.get(id);
            if (value !== undefined) {
              this.pendingChanges.push({
                type: "component",
                action: "set",
                componentName,
                id,
                value: value as Record<string, unknown>,
              });
            } else {
              this.pendingChanges.push({
                type: "component",
                action: "remove",
                componentName,
                id,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Find the component name for a given Y.Map instance.
   */
  private findComponentNameForMap(map: Y.Map<unknown>): string | undefined {
    const componentsMap = this.doc.getMap("components");
    for (const [name, value] of componentsMap.entries()) {
      if (value === map) {
        return name;
      }
    }
    return undefined;
  }

  /**
   * Called when a component is added to an entity.
   */
  onComponentAdded(
    componentDef: AnyEditorComponentDef,
    id: string,
    entityId: number,
    data: Record<string, unknown>,
  ): void {
    // Register UUID -> entityId mapping
    if (!this.idToEntityId.has(id)) {
      this.idToEntityId.set(id, entityId);
      this.entityIdToId.set(entityId, id);
    }

    // Track which synced components this entity has
    let components = this.entityIdToSyncedComponents.get(entityId);
    if (!components) {
      components = new Set();
      this.entityIdToSyncedComponents.set(entityId, components);
    }
    components.add(componentDef.name);

    // Translate refs from entityIds to syncedIds before storing
    const translatedData = this.translateRefsOutbound(componentDef, data);

    if (componentDef.__sync === "document") {
      // Store in Yjs document for persistence
      const componentsMap = this.doc.getMap("components");
      let componentMap = componentsMap.get(componentDef.name) as Y.Map<unknown>;

      if (!componentMap) {
        componentMap = new Y.Map();
        componentsMap.set(componentDef.name, componentMap);
      }

      componentMap.set(id, translatedData);
    } else if (componentDef.__sync === "ephemeral") {
      // Store in awareness for ephemeral sync (presence/cursors)
      const key = `${componentDef.name}:${id}`;
      this.setLocalEphemeral(key, translatedData);
      this.localEphemeralKeys.add(key);
    }
  }

  /**
   * Called when a component is updated.
   */
  onComponentUpdated(
    componentDef: AnyEditorComponentDef,
    id: string,
    data: Record<string, unknown>,
  ): void {
    // Translate refs from entityIds to syncedIds before storing
    const translatedData = this.translateRefsOutbound(componentDef, data);

    if (componentDef.__sync === "document") {
      const componentsMap = this.doc.getMap("components");
      const componentMap = componentsMap.get(componentDef.name) as
        | Y.Map<unknown>
        | undefined;

      if (componentMap) {
        componentMap.set(id, translatedData);
      }
    } else if (componentDef.__sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.setLocalEphemeral(key, translatedData);
      this.localEphemeralKeys.add(key);
    }
  }

  /**
   * Called when a component is removed from an entity.
   */
  onComponentRemoved(componentDef: AnyEditorComponentDef, id: string): void {
    if (componentDef.__sync === "document") {
      const componentsMap = this.doc.getMap("components");
      const componentMap = componentsMap.get(componentDef.name) as
        | Y.Map<unknown>
        | undefined;

      if (componentMap) {
        componentMap.delete(id);
      }
    } else if (componentDef.__sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.removeLocalEphemeral(key);
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
   */
  onSingletonUpdated(singletonDef: AnyEditorSingletonDef, data: unknown): void {
    // Only handle document-synced singletons
    if (singletonDef.__sync !== "document") return;

    const singletonsMap = this.doc.getMap("singletons");
    singletonsMap.set(singletonDef.name, data);
  }

  /**
   * Commit pending changes.
   * Called by the Editor at the end of each frame.
   * With UndoManager, changes are automatically grouped by captureTimeout.
   */
  commit(): void {
    // Flush batched ephemeral changes to awareness
    this.flushLocalEphemeral();
  }

  /**
   * Flush pending external changes to the ECS world.
   * Called by the Editor each frame.
   */
  flushChanges(ctx: Context): void {
    if (this.pendingChanges.length === 0) return;

    for (const change of this.pendingChanges) {
      if (change.type === "component") {
        if (change.action === "remove") {
          this.removeComponentFromEntity(ctx, change.componentName, change.id);
        } else if (change.value) {
          this.addComponentToEntity(
            ctx,
            change.componentName,
            change.id,
            change.value,
          );
        }
      } else if (change.type === "singleton") {
        this.updateSingleton(ctx, change.singletonName, change.value);
      }
    }

    this.pendingChanges = [];
  }

  // ─── Ref Translation ─────────────────────────────────────────────────────────

  /**
   * Translate ref fields from entityIds to syncedIds for outbound storage.
   */
  private translateRefsOutbound(
    componentDef: AnyEditorComponentDef,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const schema = componentDef.schema as ComponentSchema;
    let hasRefs = false;

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
        result[fieldName] = syncedId ?? null;
      }
    }
    return result;
  }

  /**
   * Translate ref fields from syncedIds to entityIds for inbound data.
   */
  private translateRefsInbound(
    componentDef: AnyEditorComponentDef,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const schema = componentDef.schema as ComponentSchema;
    let hasRefs = false;

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
        result[fieldName] = entityId ?? null;
      }
    }

    return result;
  }

  // ─── Helpers for applying external changes to ECS ───────────────────────────

  /**
   * Remove a component from an entity by its stable ID.
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

      // If "block" component was removed, the entity is deleted - clean up everything
      if (componentName === "block") {
        this.deleteEntityAndCleanupYjs(ctx, entityId, id);
        return;
      }

      // Check if entity still has valid component combination
      const remainingComponents = this.getEntitySyncedComponents(ctx, entityId);

      // If no synced components remain, delete entity
      if (remainingComponents.size === 0) {
        removeEntity(ctx, entityId);
        this.idToEntityId.delete(id);
        this.entityIdToId.delete(entityId);
        return;
      }

      // Check if remaining components form a valid block type
      if (!this.isValidBlockEntity(id, remainingComponents)) {
        this.deleteEntityAndCleanupYjs(ctx, entityId, id);
      }
    }
  }

  /**
   * Get the set of synced component names on an entity.
   */
  private getEntitySyncedComponents(
    ctx: Context,
    entityId: number,
  ): Set<string> {
    const result = new Set<string>();
    const syncedCompId = Synced._getComponentId(ctx);

    for (const compId of ctx.entityBuffer.getComponentIds(entityId)) {
      if (compId === syncedCompId) continue;

      // Find component name by matching component IDs
      for (const [name, def] of this.componentDefsByName) {
        if (def._getComponentId(ctx) === compId) {
          result.add(name);
          break;
        }
      }
    }
    return result;
  }

  /**
   * Check if the remaining components form a valid block entity.
   * Gets the tag from the block component and validates against that block definition.
   */
  private isValidBlockEntity(id: string, components: Set<string>): boolean {
    // Must have "block" component
    if (!components.has("block")) {
      return false;
    }

    // Get the block component data from Yjs to read the tag
    const componentsMap = this.doc.getMap("components");
    const blockMap = componentsMap.get("block") as Y.Map<unknown> | undefined;
    const blockData = blockMap?.get(id) as Record<string, unknown> | undefined;
    const tag = blockData?.tag as string | undefined;

    if (!tag) {
      return false;
    }

    // Get required components for this block type
    const requiredNames = this.blockRequiredComponents.get(tag);
    if (!requiredNames) {
      // Unknown tag - invalid
      return false;
    }

    // Check if all required components are present
    return requiredNames.every((name) => components.has(name));
  }

  /**
   * Delete an entity and clean up all its components from Yjs.
   */
  private deleteEntityAndCleanupYjs(
    ctx: Context,
    entityId: number,
    id: string,
  ): void {
    const componentsMap = this.doc.getMap("components");

    // Remove all remaining components from ECS and track which to clean from Yjs
    const componentsToClean: string[] = [];
    for (const [name, def] of this.componentDefsByName) {
      if (hasComponent(ctx, entityId, def)) {
        removeComponent(ctx, entityId, def);
        componentsToClean.push(name);
      }
    }

    // Remove entity
    removeEntity(ctx, entityId);
    this.idToEntityId.delete(id);
    this.entityIdToId.delete(entityId);

    // Clean up components from Yjs to propagate deletion
    for (const name of componentsToClean) {
      const componentMap = componentsMap.get(name) as
        | Y.Map<unknown>
        | undefined;
      if (componentMap?.has(id)) {
        componentMap.delete(id);
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

  /**
   * Add a component to an entity, creating the entity if it doesn't exist.
   * Used for applying both document and ephemeral changes from external sources.
   */
  private addComponentToEntity(
    ctx: Context,
    componentName: string,
    id: string,
    value: Record<string, unknown>,
  ): void {
    const componentDef = this.componentDefsByName.get(componentName);
    if (!componentDef) return;

    let entityId = this.idToEntityId.get(id);

    // Check if entity exists and is alive
    if (entityId === undefined || !isAlive(ctx, entityId)) {
      // Clean up stale mapping if entity is dead
      if (entityId !== undefined) {
        this.entityIdToId.delete(entityId);
      }

      // Create new entity
      entityId = createEntity(ctx);

      // Clean up any stale mapping that points to this reused entity ID
      // (ECS may reuse entity IDs from deleted entities)
      const staleId = this.entityIdToId.get(entityId);
      if (staleId !== undefined && staleId !== id) {
        this.idToEntityId.delete(staleId);
      }

      this.idToEntityId.set(id, entityId);
      this.entityIdToId.set(entityId, id);
      addComponent(ctx, entityId, Synced, { id });
    }

    // Translate refs and apply component data
    const translatedValue = this.translateRefsInbound(componentDef, value);
    if (hasComponent(ctx, entityId, componentDef)) {
      componentDef.copy(ctx, entityId, translatedValue as any);
    } else {
      addComponent(ctx, entityId, componentDef, translatedValue as any);
    }

    // Track synced components
    let components = this.entityIdToSyncedComponents.get(entityId);
    if (!components) {
      components = new Set();
      this.entityIdToSyncedComponents.set(entityId, components);
    }
    components.add(componentName);
  }

  // ─── Ephemeral (Awareness) Helpers ──────────────────────────────────────────

  /**
   * Queue a key to be set in the local awareness state.
   * Changes are batched and sent in commit().
   */
  private setLocalEphemeral(key: string, value: Record<string, unknown>): void {
    this.pendingLocalEphemeral.set(key, value);
  }

  /**
   * Queue a key to be removed from the local awareness state (tombstone).
   * Changes are batched and sent in commit().
   */
  private removeLocalEphemeral(key: string): void {
    this.pendingLocalEphemeral.set(key, null);
  }

  /**
   * Flush all pending local ephemeral changes to awareness.
   */
  private flushLocalEphemeral(): void {
    if (this.pendingLocalEphemeral.size === 0) return;

    const currentState = this.awareness.getLocalState() || {};
    const ephemeral = {
      ...((currentState.ephemeral as Record<string, unknown>) || {}),
    };

    // Apply all pending changes
    for (const [key, value] of this.pendingLocalEphemeral) {
      ephemeral[key] = value;
    }

    this.awareness.setLocalStateField("ephemeral", ephemeral);
    this.pendingLocalEphemeral.clear();
  }

  /**
   * Queue awareness changes from remote peers for processing in flushChanges.
   * Uses null values as tombstones to signal deletion.
   */
  private queueAwarenessChanges(changes: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void {
    const states = this.awareness.getStates();
    const localClientId = this.awareness.clientID;

    // Process added and updated clients
    for (const clientId of [...changes.added, ...changes.updated]) {
      if (clientId === localClientId) continue; // Skip local changes

      const state = states.get(clientId);
      const ephemeral = (state?.ephemeral || {}) as Record<
        string,
        Record<string, unknown> | null
      >;

      for (const [key, value] of Object.entries(ephemeral)) {
        const colonIndex = key.indexOf(":");
        if (colonIndex === -1) continue;

        const componentName = key.slice(0, colonIndex);
        const id = key.slice(colonIndex + 1);

        if (value === null) {
          // Tombstone - signal removal
          this.pendingChanges.push({
            type: "component",
            action: "remove",
            componentName,
            id,
          });
        } else {
          this.pendingChanges.push({
            type: "component",
            action: "set",
            componentName,
            id,
            value,
          });
        }
      }
    }

    // Note: When a client disconnects (changes.removed), their awareness state
    // is cleared automatically. The ECS entities will remain until explicitly
    // removed or the session ends.
  }

  /**
   * Start the ephemeral data refresh interval.
   * Refreshes at half the timeout period to ensure data stays alive.
   */
  private startEphemeralRefresh(): void {
    if (this.ephemeralRefreshInterval) return;

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
   * Refresh all local ephemeral data to keep it alive.
   * Re-sets the awareness state to reset the TTL.
   */
  private refreshEphemeralData(): void {
    if (this.localEphemeralKeys.size === 0) return;

    const currentState = this.awareness.getLocalState();
    if (currentState?.ephemeral) {
      // Re-set the ephemeral field to refresh the awareness state
      this.awareness.setLocalStateField("ephemeral", currentState.ephemeral);
    }
  }

  // ─── Undo/Redo ──────────────────────────────────────────────────────────────

  /**
   * Undo to the previous state.
   */
  undo(): void {
    if (this.undoManager?.canUndo()) {
      this.undoManager.undo();
    }
  }

  /**
   * Redo the previously undone operation.
   */
  redo(): void {
    if (this.undoManager?.canRedo()) {
      this.undoManager.redo();
    }
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoManager?.canUndo() ?? false;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.undoManager?.canRedo() ?? false;
  }

  /**
   * Get the underlying Yjs document.
   * Useful for advanced integrations like y-websocket.
   */
  getDoc(): Y.Doc {
    return this.doc;
  }

  /**
   * Get the UndoManager instance.
   * Useful for advanced undo/redo control.
   */
  getUndoManager(): Y.UndoManager | null {
    return this.undoManager;
  }

  /**
   * Get the WebSocket provider instance.
   * Useful for accessing awareness (presence) features.
   */
  getWebsocketProvider(): WebsocketProvider | null {
    return this.websocketProvider;
  }

  /**
   * Get the Awareness instance.
   * Useful for custom presence features.
   */
  getAwareness(): awarenessProtocol.Awareness {
    return this.awareness;
  }

  /**
   * Check if the store is currently connected to the WebSocket server.
   */
  isOnline(): boolean {
    return (
      this.websocketProvider !== null && this.websocketProvider.wsconnected
    );
  }

  /**
   * Set the online/offline mode.
   * When online, connects to the WebSocket server for multiplayer sync.
   * When offline, disconnects but keeps local persistence working.
   *
   * @param online - Whether to be online (connected to WebSocket)
   */
  setOnline(online: boolean): void {
    if (!this.websocketUrl) {
      // No WebSocket URL configured, can't go online
      return;
    }

    if (online && !this.websocketProvider) {
      // Connect to WebSocket
      this.websocketProvider = new WebsocketProvider(
        this.websocketUrl,
        this.documentId,
        this.doc,
        { awareness: this.awareness },
      );
    } else if (!online && this.websocketProvider) {
      // Disconnect from WebSocket
      this.websocketProvider.destroy();
      this.websocketProvider = null;
    }
  }

  /**
   * Dispose and cleanup resources.
   */
  dispose(): void {
    // Stop ephemeral refresh interval
    this.stopEphemeralRefresh();

    this.undoManager?.destroy();
    this.undoManager = null;

    // Destroy awareness before websocket provider
    this.awareness.destroy();

    if (this.websocketProvider) {
      this.websocketProvider.destroy();
      this.websocketProvider = null;
    }

    if (this.persistence) {
      this.persistence.destroy();
      this.persistence = null;
    }

    this.doc.destroy();
    this.initialized = false;
  }
}
