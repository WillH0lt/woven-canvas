import * as Automerge from "@automerge/automerge";
import {
  Repo,
  DocHandle,
  type AutomergeUrl,
  type DocHandleChangePayload,
} from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { debounce } from "lodash-es";
import {
  createEntity,
  addComponent,
  removeComponent,
  removeEntity,
  hasComponent,
  Synced,
  isAlive,
  defineQuery,
  User,
  type Context,
  type StoreAdapter,
  type AnyEditorComponentDef,
  type AnyEditorSingletonDef,
  type ComponentSchema,
} from "@infinitecanvas/editor";
import { LocalDB, type AutomergeDocData } from "./LocalDB";

// Query for connected users - used to adjust commit frequency
const usersQuery = defineQuery((q) => q.with(User));

/**
 * Ephemeral presence data stored per peer.
 * Uses a simple key-value structure that maps to component data.
 */
interface EphemeralData {
  [key: string]: Record<string, unknown> | undefined;
}

/**
 * Undo checkpoint for time-based undo grouping.
 */
interface UndoCheckpoint {
  heads: Automerge.Heads;
  timestamp: number;
}

/**
 * StoreOptions - Options for configuring the Automerge Store.
 */
export interface StoreOptions {
  documentId: string;
  websocketUrl?: string;
  useLocalPersistence?: boolean;
  ephemeralTimeoutMs?: number;
  /** Time in ms without changes before creating an undo checkpoint. Default: 1000ms */
  undoCheckpointDelayMs?: number;
}

/**
 * Store - A StoreAdapter using Automerge CRDT for local-first multiplayer.
 *
 * Features:
 * - Local persistence via IndexedDB (incremental saves + snapshots)
 * - Real-time multiplayer via WebSocket (optional)
 * - Smart undo/redo with time-based checkpointing (1 second idle = new checkpoint)
 * - Efficient change handling with field-level granularity
 * - Automatic CRDT conflict resolution
 * - Ephemeral presence data via broadcast channel
 *
 * Key improvements over Loro-based store:
 * - Time-based undo checkpoints reduce history bloat during continuous edits
 * - Field-level updates instead of full component replacement
 * - More efficient binary format for large documents
 *
 * @example
 * ```typescript
 * const store = new Store({
 *   documentId: "my-document",
 *   useLocalPersistence: true,
 *   websocketUrl: "wss://sync.example.com",
 *   undoCheckpointDelayMs: 1000,
 * });
 *
 * await store.initialize(components, singletons);
 *
 * const editor = new Editor(container, {
 *   store,
 *   plugins: [...],
 * });
 * ```
 */
export class Store implements StoreAdapter {
  private repo: Repo | null = null;
  private handle: DocHandle<AutomergeDocData> | null = null;
  private doc: Automerge.Doc<AutomergeDocData> | null = null;

  // Undo/Redo system with time-based checkpointing
  private undoStack: UndoCheckpoint[] = [];
  private redoStack: UndoCheckpoint[] = [];
  private lastChangeTimestamp: number = 0;
  private undoCheckpointDelayMs: number;
  private pendingCheckpointHeads: Automerge.Heads | null = null;

  // Persistence
  private localDB?: LocalDB;

  // Network
  private websocketUrl?: string;
  private ephemeralTimeoutMs: number;
  private documentId: string;

  // Ephemeral presence data (for cursor positions, selections, etc.)
  private localEphemeralData: EphemeralData = {};
  private remoteEphemeralData: Map<string, EphemeralData> = new Map();
  private ephemeralRefreshInterval: ReturnType<typeof setInterval> | null =
    null;
  private broadcastChannel: BroadcastChannel | null = null;

  private initialized: boolean = false;

  // Beforeunload handler reference for cleanup
  private beforeUnload: (() => void) | null = null;

  // Bidirectional sync state for document-synced components
  private componentDefsByName: Map<string, AnyEditorComponentDef> = new Map();
  private singletonDefsByName: Map<string, AnyEditorSingletonDef> = new Map();
  private idToEntityId: Map<string, number> = new Map();
  private entityIdToId: Map<number, string> = new Map();
  private entityIdToSyncedComponents: Map<number, Set<string>> = new Map();

  // Pending changes from remote sync or undo/redo
  private pendingChanges: boolean = false;
  private pendingEphemeralUpdates: Array<{
    peerId: string;
    data: EphemeralData;
  }> = [];
  private pendingEphemeralRemovals: string[] = [];

  // Debounced checkpoint creator - creates checkpoint after inactivity
  private createUndoCheckpointDebounced: ReturnType<typeof debounce>;

  constructor(options: StoreOptions = { documentId: "default" }) {
    this.documentId = options.documentId;
    this.websocketUrl = options.websocketUrl;
    this.ephemeralTimeoutMs = options.ephemeralTimeoutMs ?? 10000;
    this.undoCheckpointDelayMs = options.undoCheckpointDelayMs ?? 1000;

    if (options.useLocalPersistence) {
      this.localDB = new LocalDB(`automerge-${options.documentId}`);
    }

    // Create debounced checkpoint function
    this.createUndoCheckpointDebounced = debounce(() => {
      this.finalizeUndoCheckpoint();
    }, this.undoCheckpointDelayMs);
  }

  /**
   * Initialize the store with component/singleton definitions.
   * Sets up persistence, networking, and the Automerge document.
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

    // Initialize local persistence and load document
    if (this.localDB) {
      await this.localDB.initialize();
      this.doc = await this.localDB.load();
    } else {
      // Create new document with initial structure
      this.doc = Automerge.from<AutomergeDocData>({
        components: {},
        singletons: {},
      });
    }

    // Set up Automerge Repo for networking
    const networkAdapters: any[] = [new BroadcastChannelNetworkAdapter()];
    if (this.websocketUrl) {
      networkAdapters.push(
        new BrowserWebSocketClientAdapter(this.websocketUrl),
      );
    }

    this.repo = new Repo({
      network: networkAdapters,
      storage: new IndexedDBStorageAdapter(`automerge-repo-${this.documentId}`),
    });

    // Create or find the document handle
    const existingUrl = localStorage.getItem(
      `automerge-doc-${this.documentId}`,
    );
    if (existingUrl && this.isValidAutomergeUrl(existingUrl)) {
      const foundHandle = this.repo.find<AutomergeDocData>(
        existingUrl as AutomergeUrl,
      );
      // Handle might be sync or async depending on automerge-repo version
      this.handle =
        foundHandle instanceof Promise ? await foundHandle : foundHandle;
      await this.handle!.whenReady();
      // Merge local doc with remote
      const remoteDoc = this.handle!.docSync();
      if (remoteDoc) {
        this.doc = Automerge.merge(this.doc, remoteDoc);
        this.handle!.change((d: AutomergeDocData) => {
          // Sync our local changes to the handle
          Object.assign(d, Automerge.toJS(this.doc!));
        });
      }
    } else {
      this.handle = this.repo.create<AutomergeDocData>();
      this.handle.change((d: AutomergeDocData) => {
        d.components = this.doc!.components || {};
        d.singletons = this.doc!.singletons || {};
      });
      localStorage.setItem(`automerge-doc-${this.documentId}`, this.handle.url);
    }

    // Subscribe to remote changes
    this.handle!.on("change", this.onRemoteChange.bind(this));

    // Set up ephemeral data broadcast channel
    this.setupEphemeralChannel();

    // Start ephemeral data refresh to keep local data alive
    this.startEphemeralRefresh();

    // Initialize undo stack with current state
    this.undoStack = [];
    this.redoStack = [];
    this.pendingCheckpointHeads = Automerge.getHeads(this.doc);
    this.lastChangeTimestamp = Date.now();

    // Register beforeunload handler to flush pending saves
    if (typeof window !== "undefined") {
      this.beforeUnload = () => {
        this.createUndoCheckpointDebounced.flush();
        // Note: We can't await this in beforeunload, but we try to trigger the save
        void this.localDB?.flush();
      };
      window.addEventListener("beforeunload", this.beforeUnload);
    }

    this.initialized = true;
  }

  private isValidAutomergeUrl(url: string): boolean {
    return url.startsWith("automerge:");
  }

  private onRemoteChange(
    payload: DocHandleChangePayload<AutomergeDocData>,
  ): void {
    // Mark that we have pending changes to apply to ECS
    this.pendingChanges = true;
    // Update local doc reference
    this.doc = payload.doc;
  }

  /**
   * Set up BroadcastChannel for ephemeral presence data.
   * This is used for cursor positions, selections, etc.
   */
  private setupEphemeralChannel(): void {
    this.broadcastChannel = new BroadcastChannel(
      `automerge-ephemeral-${this.documentId}`,
    );

    this.broadcastChannel.onmessage = (event) => {
      const { type, peerId, data } = event.data;

      if (type === "presence") {
        this.pendingEphemeralUpdates.push({ peerId, data });
        this.remoteEphemeralData.set(peerId, data);
      } else if (type === "leave") {
        this.pendingEphemeralRemovals.push(peerId);
        this.remoteEphemeralData.delete(peerId);
      }
    };

    // Announce presence on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.broadcastChannel?.postMessage({
          type: "leave",
          peerId: this.getPeerId(),
        });
      });
    }
  }

  private getPeerId(): string {
    // Use repo's peer ID or generate a random one
    return (
      this.repo?.networkSubsystem?.peerId ||
      `peer-${Math.random().toString(36).slice(2)}`
    );
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

    // Track synced components for this entity
    let components = this.entityIdToSyncedComponents.get(entityId);
    if (!components) {
      components = new Set();
      this.entityIdToSyncedComponents.set(entityId, components);
    }
    components.add(componentDef.name);

    // Translate refs from entityIds to syncedIds
    const translatedData = this.translateRefsOutbound(componentDef, data);

    if (componentDef.__sync === "document") {
      this.updateDocument((doc) => {
        if (!doc.components[componentDef.name]) {
          doc.components[componentDef.name] = {};
        }
        doc.components[componentDef.name][id] = translatedData;
      });
    } else if (componentDef.__sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.localEphemeralData[key] = translatedData;
    }
  }

  /**
   * Called when a component is updated.
   * Uses field-level updates for efficiency.
   */
  onComponentUpdated(
    componentDef: AnyEditorComponentDef,
    id: string,
    data: Record<string, unknown>,
  ): void {
    // Translate refs from entityIds to syncedIds
    const translatedData = this.translateRefsOutbound(componentDef, data);

    if (componentDef.__sync === "document") {
      this.updateDocument((doc) => {
        if (!doc.components[componentDef.name]) {
          doc.components[componentDef.name] = {};
        }
        const existing = doc.components[componentDef.name][id];
        if (existing) {
          // Field-level update for efficiency
          for (const key of Object.keys(translatedData)) {
            (existing as any)[key] = translatedData[key];
          }
        } else {
          doc.components[componentDef.name][id] = translatedData;
        }
      });
    } else if (componentDef.__sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      this.localEphemeralData[key] = translatedData;
    }
  }

  /**
   * Called when a component is removed from an entity.
   */
  onComponentRemoved(componentDef: AnyEditorComponentDef, id: string): void {
    if (componentDef.__sync === "document") {
      this.updateDocument((doc) => {
        if (doc.components[componentDef.name]) {
          delete doc.components[componentDef.name][id];
        }
      });
    } else if (componentDef.__sync === "ephemeral") {
      const key = `${componentDef.name}:${id}`;
      delete this.localEphemeralData[key];
    }

    // Clean up UUID -> entityId mapping
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
    this.updateDocument((doc) => {
      doc.singletons[singletonDef.name] = data;
    });
  }

  /**
   * Update the Automerge document with a change function.
   * Handles undo checkpoint management.
   */
  private updateDocument(changeFn: (doc: AutomergeDocData) => void): void {
    if (!this.doc) return;

    const now = Date.now();

    // If this is the first change after idle, save checkpoint heads
    if (now - this.lastChangeTimestamp > this.undoCheckpointDelayMs) {
      this.finalizeUndoCheckpoint();
      this.pendingCheckpointHeads = Automerge.getHeads(this.doc);
    }

    this.lastChangeTimestamp = now;

    // Apply the change
    this.doc = Automerge.change(this.doc, changeFn);

    // Update handle if connected
    if (this.handle) {
      this.handle.change(changeFn);
    }

    // Clear redo stack on new changes
    this.redoStack = [];

    // Schedule checkpoint creation after inactivity
    this.createUndoCheckpointDebounced();
  }

  /**
   * Finalize and save an undo checkpoint.
   * Called after the debounce period of inactivity.
   */
  private finalizeUndoCheckpoint(): void {
    if (!this.doc || !this.pendingCheckpointHeads) return;

    const currentHeads = Automerge.getHeads(this.doc);

    // Only save if there were actual changes
    if (this.pendingCheckpointHeads.join(",") !== currentHeads.join(",")) {
      this.undoStack.push({
        heads: this.pendingCheckpointHeads,
        timestamp: this.lastChangeTimestamp,
      });

      // Limit undo stack size
      if (this.undoStack.length > 100) {
        this.undoStack.shift();
      }
    }

    this.pendingCheckpointHeads = currentHeads;
  }

  /**
   * Commit pending changes. Called by the Editor each frame.
   * Uses adaptive frequency based on activity.
   */
  commit(): void {
    // Save to local persistence
    if (this.localDB && this.doc) {
      this.localDB.saveDoc(this.doc);
    }

    // Broadcast ephemeral data
    if (
      this.broadcastChannel &&
      Object.keys(this.localEphemeralData).length > 0
    ) {
      this.broadcastChannel.postMessage({
        type: "presence",
        peerId: this.getPeerId(),
        data: this.localEphemeralData,
      });
    }
  }

  /**
   * Refresh ephemeral data to keep it alive.
   */
  private refreshEphemeralData(): void {
    // Broadcast local ephemeral data periodically to keep it alive
    if (
      this.broadcastChannel &&
      Object.keys(this.localEphemeralData).length > 0
    ) {
      this.broadcastChannel.postMessage({
        type: "presence",
        peerId: this.getPeerId(),
        data: this.localEphemeralData,
      });
    }
  }

  private startEphemeralRefresh(): void {
    if (this.ephemeralRefreshInterval) return;

    const refreshMs = Math.max(1000, this.ephemeralTimeoutMs / 2);
    this.ephemeralRefreshInterval = setInterval(() => {
      this.refreshEphemeralData();
    }, refreshMs);
  }

  private stopEphemeralRefresh(): void {
    if (this.ephemeralRefreshInterval) {
      clearInterval(this.ephemeralRefreshInterval);
      this.ephemeralRefreshInterval = null;
    }
  }

  /**
   * Flush pending changes from remote sync or undo/redo to ECS.
   */
  flushChanges(ctx: Context): void {
    // Process document changes from remote sync
    if (this.pendingChanges && this.doc) {
      this.applyDocumentToECS(ctx, this.doc);
      this.pendingChanges = false;
    }

    // Process ephemeral updates
    for (const { peerId, data } of this.pendingEphemeralUpdates) {
      this.applyEphemeralData(ctx, peerId, data);
    }
    this.pendingEphemeralUpdates = [];

    // Process ephemeral removals
    for (const peerId of this.pendingEphemeralRemovals) {
      this.removeEphemeralData(ctx, peerId);
    }
    this.pendingEphemeralRemovals = [];
  }

  /**
   * Apply document state to ECS. Used for sync and undo/redo.
   */
  private applyDocumentToECS(
    ctx: Context,
    doc: Automerge.Doc<AutomergeDocData>,
  ): void {
    const docData = Automerge.toJS(doc) as AutomergeDocData;

    // Track which entities we've seen
    const seenIds = new Set<string>();

    // Apply component changes
    for (const [componentName, entities] of Object.entries(
      docData.components || {},
    )) {
      const componentDef = this.componentDefsByName.get(componentName);
      if (!componentDef) continue;

      for (const [id, data] of Object.entries(entities)) {
        seenIds.add(id);
        this.applyComponentToEntity(
          ctx,
          componentDef,
          id,
          data as Record<string, unknown>,
        );
      }
    }

    // Remove entities that are no longer in the document
    for (const [id, entityId] of this.idToEntityId) {
      if (!seenIds.has(id) && isAlive(ctx, entityId)) {
        // Check if this entity had document-synced components
        const components = this.entityIdToSyncedComponents.get(entityId);
        if (components) {
          for (const componentName of components) {
            const componentDef = this.componentDefsByName.get(componentName);
            if (componentDef && componentDef.__sync === "document") {
              if (hasComponent(ctx, entityId, componentDef)) {
                removeComponent(ctx, entityId, componentDef);
              }
            }
          }
        }
      }
    }

    // Apply singleton changes
    for (const [singletonName, data] of Object.entries(
      docData.singletons || {},
    )) {
      const singletonDef = this.singletonDefsByName.get(singletonName);
      if (singletonDef) {
        singletonDef.copy(ctx, data as any);
      }
    }
  }

  /**
   * Apply a component to an entity, creating if needed.
   */
  private applyComponentToEntity(
    ctx: Context,
    componentDef: AnyEditorComponentDef,
    id: string,
    data: Record<string, unknown>,
  ): void {
    let entityId = this.idToEntityId.get(id);

    if (entityId === undefined || !isAlive(ctx, entityId)) {
      // Create new entity
      entityId = createEntity(ctx);
      this.idToEntityId.set(id, entityId);
      this.entityIdToId.set(entityId, id);
      addComponent(ctx, entityId, Synced, { id });
    }

    const translatedData = this.translateRefsInbound(componentDef, data);

    if (hasComponent(ctx, entityId, componentDef)) {
      componentDef.copy(ctx, entityId, translatedData as any);
    } else {
      addComponent(ctx, entityId, componentDef, translatedData as any);
    }

    // Track synced components
    let components = this.entityIdToSyncedComponents.get(entityId);
    if (!components) {
      components = new Set();
      this.entityIdToSyncedComponents.set(entityId, components);
    }
    components.add(componentDef.name);
  }

  /**
   * Apply ephemeral presence data from a remote peer.
   */
  private applyEphemeralData(
    ctx: Context,
    peerId: string,
    data: EphemeralData,
  ): void {
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;

      const colonIndex = key.indexOf(":");
      if (colonIndex === -1) continue;

      const componentName = key.slice(0, colonIndex);
      const id = key.slice(colonIndex + 1);

      const componentDef = this.componentDefsByName.get(componentName);
      if (!componentDef || componentDef.__sync !== "ephemeral") continue;

      // Prefix the ID with peer ID to distinguish from local entities
      const peerEntityId = `${peerId}:${id}`;
      this.applyComponentToEntity(ctx, componentDef, peerEntityId, value);
    }
  }

  /**
   * Remove ephemeral data when a peer leaves.
   */
  private removeEphemeralData(ctx: Context, peerId: string): void {
    const previousData = this.remoteEphemeralData.get(peerId);
    if (!previousData) return;

    for (const key of Object.keys(previousData)) {
      const colonIndex = key.indexOf(":");
      if (colonIndex === -1) continue;

      const componentName = key.slice(0, colonIndex);
      const id = key.slice(colonIndex + 1);
      const peerEntityId = `${peerId}:${id}`;

      const componentDef = this.componentDefsByName.get(componentName);
      if (!componentDef) continue;

      const entityId = this.idToEntityId.get(peerEntityId);
      if (entityId !== undefined && isAlive(ctx, entityId)) {
        if (hasComponent(ctx, entityId, componentDef)) {
          removeComponent(ctx, entityId, componentDef);
        }
        removeEntity(ctx, entityId);
        this.idToEntityId.delete(peerEntityId);
        this.entityIdToId.delete(entityId);
      }
    }

    this.remoteEphemeralData.delete(peerId);
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

  // ─── Undo/Redo ───────────────────────────────────────────────────────────────

  /**
   * Undo to the previous checkpoint.
   * Checkpoints are created automatically after 1 second of inactivity.
   */
  undo(): void {
    if (!this.doc || this.undoStack.length === 0) return;

    // Finalize any pending checkpoint first
    this.createUndoCheckpointDebounced.flush();

    const checkpoint = this.undoStack.pop()!;

    // Save current state to redo stack
    this.redoStack.push({
      heads: Automerge.getHeads(this.doc),
      timestamp: Date.now(),
    });

    // Restore to checkpoint
    // We need to load a clean version at the checkpoint heads
    const binary = Automerge.save(this.doc);
    let restored = Automerge.load<AutomergeDocData>(binary);

    // Create a view at the checkpoint heads
    const changes = Automerge.getAllChanges(this.doc);
    const checkpointDoc = Automerge.from<AutomergeDocData>({
      components: {},
      singletons: {},
    });

    // Apply changes up to checkpoint
    for (const change of changes) {
      const decoded = Automerge.decodeChange(change);
      if (checkpoint.heads.includes(decoded.hash)) {
        break;
      }
    }

    // For proper undo, we need to use Automerge's view at specific heads
    try {
      // Get the document state at the checkpoint heads
      const viewAtCheckpoint = Automerge.view(this.doc, checkpoint.heads);
      this.doc = Automerge.clone(viewAtCheckpoint);
    } catch {
      // Fallback: restore from snapshot
      console.warn("Undo: Could not view at checkpoint, using fallback");
      return;
    }

    // Mark changes pending to apply to ECS
    this.pendingChanges = true;
    this.pendingCheckpointHeads = Automerge.getHeads(this.doc);

    // Update handle
    if (this.handle) {
      const doc = this.doc;
      this.handle.change((d: AutomergeDocData) => {
        Object.assign(d, Automerge.toJS(doc));
      });
    }
  }

  /**
   * Redo a previously undone change.
   */
  redo(): void {
    if (!this.doc || this.redoStack.length === 0) return;

    const checkpoint = this.redoStack.pop()!;

    // Save current state to undo stack
    this.undoStack.push({
      heads: Automerge.getHeads(this.doc),
      timestamp: Date.now(),
    });

    // Restore to checkpoint
    try {
      const viewAtCheckpoint = Automerge.view(this.doc, checkpoint.heads);
      this.doc = Automerge.clone(viewAtCheckpoint);
    } catch {
      console.warn("Redo: Could not view at checkpoint, using fallback");
      this.undoStack.pop(); // Revert undo stack change
      return;
    }

    // Mark changes pending to apply to ECS
    this.pendingChanges = true;
    this.pendingCheckpointHeads = Automerge.getHeads(this.doc);

    // Update handle
    if (this.handle) {
      const doc = this.doc;
      this.handle.change((d: AutomergeDocData) => {
        Object.assign(d, Automerge.toJS(doc));
      });
    }
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
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

    // Stop ephemeral refresh
    this.stopEphemeralRefresh();

    // Close broadcast channel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: "leave",
        peerId: this.getPeerId(),
      });
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Cancel pending debounced operations
    this.createUndoCheckpointDebounced.cancel();

    // Close local DB
    this.localDB?.dispose();

    // Close repo (this closes network adapters)
    // Note: automerge-repo doesn't have a direct close method,
    // but network adapters will be garbage collected

    this.initialized = false;
  }
}
