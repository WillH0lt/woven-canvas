import type { Context } from "@infinitecanvas/ecs";

import type { AnyEditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef } from "./EditorSingletonDef";
import type { Adapter } from "./Adapter";
import type { Mutation } from "./types";
import { EcsAdapter } from "./adapters/ECS";
import { PersistenceAdapter } from "./adapters/Persistence";
import { HistoryAdapter } from "./adapters/History";
import {
  WebsocketAdapter,
  type WebsocketAdapterOptions,
} from "./adapters/Websocket";

/**
 * Options for EditorSync
 */
export interface EditorSyncOptions {
  documentId: string;
  components?: AnyEditorComponentDef[];
  singletons?: AnyEditorSingletonDef[];
  usePersistence?: boolean;
  useHistory?: boolean;
  websocket?: WebsocketAdapterOptions;
}

/**
 * Generic mutation router between adapters.
 *
 * Each frame:
 * 1. Pulls mutations from every adapter
 * 2. Pushes the full list to every adapter (including the adapter's own)
 *
 * Every adapter sees the same mutations in the same order, guaranteeing
 * state convergence.  Each adapter is responsible for skipping its own
 * side-effects (e.g. ECS won't re-write to the world, WS won't re-send
 * to the server) while still updating internal state to match.
 */
export class EditorSync {
  private ecsAdapter: EcsAdapter;
  private historyAdapter: HistoryAdapter | null = null;
  private adapters: Adapter[] = [];

  constructor(options: EditorSyncOptions) {
    this.ecsAdapter = new EcsAdapter({
      components: options.components || [],
      singletons: options.singletons || [],
    });
    this.adapters.push(this.ecsAdapter);

    if (options.usePersistence) {
      this.adapters.push(
        new PersistenceAdapter({ documentId: options.documentId }),
      );
    }

    if (options.useHistory) {
      this.historyAdapter = new HistoryAdapter();
      this.adapters.push(this.historyAdapter);
    }

    if (options.websocket) {
      this.adapters.push(new WebsocketAdapter(options.websocket));
    }
  }

  async initialize(): Promise<void> {
    await Promise.all(this.adapters.map((adapter) => adapter.init()));
  }

  /**
   * Synchronize mutations across all adapters.
   * Call this every frame or tick.
   */
  sync(ctx: Context): void {
    // Set the ECS context for this frame
    this.ecsAdapter.ctx = ctx;

    // Phase 1: Pull mutation from each adapter
    const allMutations: Mutation[] = [];
    for (const adapter of this.adapters) {
      const mutation = adapter.pull();
      if (mutation !== null) {
        allMutations.push(mutation);
      }
    }

    // Phase 2: Push the same list to every adapter
    for (const adapter of this.adapters) {
      adapter.push(allMutations);
    }
  }

  undo(): boolean {
    return this.historyAdapter?.undo() ?? false;
  }

  redo(): boolean {
    return this.historyAdapter?.redo() ?? false;
  }

  canUndo(): boolean {
    return this.historyAdapter?.canUndo() ?? false;
  }

  canRedo(): boolean {
    return this.historyAdapter?.canRedo() ?? false;
  }

  /**
   * Close all adapters and clean up.
   */
  close(): void {
    for (const adapter of this.adapters) {
      adapter.close();
    }
  }
}
