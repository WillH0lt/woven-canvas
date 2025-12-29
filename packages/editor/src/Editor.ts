import {
  World,
  type Context,
  type QueryDef,
  ComponentDef,
  type System,
  type SingletonDef,
  EventType,
  SINGLETON_ENTITY_ID,
  hasComponent,
} from "@infinitecanvas/ecs";

import type { EditorResources, SystemPhase } from "./types";
import type { StoreAdapter } from "./store";
import { type EditorPlugin, sortPluginsByDependencies } from "./plugin";
import { CommandMarker, cleanupCommands, type CommandDef } from "./command";
import { CorePlugin } from "./CorePlugin";
import type { AnyEditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef } from "./EditorSingletonDef";
import { Synced } from "./components";

/**
 * Editor configuration options
 */
export interface EditorOptions {
  /**
   * Plugins to load.
   * Plugins are sorted by dependencies automatically.
   */
  plugins?: EditorPlugin[];

  /**
   * Store adapter for persistence and sync.
   * Optional - editor works in ephemeral mode without a store.
   */
  store?: StoreAdapter;

  /**
   * Maximum number of entities.
   * @default 10_000
   */
  maxEntities?: number;

  /**
   * Additional custom resources accessible via getResources(ctx).
   * These are merged with the base EditorResources (which includes domElement and editor).
   */
  resources?: Record<string, unknown>;
}

/**
 * Query subscription callback
 */
export type QueryCallback = (
  ctx: Context,
  result: {
    added: number[];
    changed: number[];
    removed: number[];
  }
) => void;

/**
 * Order of system execution phases
 */
const PHASE_ORDER: SystemPhase[] = [
  "preInput",
  "input",
  "postInput",
  "preCapture",
  "capture",
  "postCapture",
  "preUpdate",
  "update",
  "postUpdate",
  "preRender",
  "render",
  "postRender",
];

/**
 * Editor is the main entry point for building editor applications.
 *
 * It manages:
 * - ECS World lifecycle
 * - Plugin registration
 * - System phase execution
 * - Command dispatch
 * - Store integration
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { SelectionPlugin, TransformPlugin } from './plugins';
 *
 * const editor = new Editor(document.getElementById('canvas')!, {
 *   plugins: [SelectionPlugin, TransformPlugin],
 *   store: myStoreAdapter,
 * });
 *
 * // Run the editor loop
 * function loop() {
 *   editor.tick();
 *   requestAnimationFrame(loop);
 * }
 * loop();
 *
 * // Emit commands from UI
 * editor.emit('selection:select-all', {});
 *
 * // Clean up
 * editor.dispose();
 * ```
 */
export class Editor {
  private world: World;
  private phases: Map<SystemPhase, System[]>;
  private plugins: Map<string, EditorPlugin>;
  private store: StoreAdapter | null;

  /** All registered components keyed by componentId */
  readonly components: Map<number, AnyEditorComponentDef> = new Map();
  /** All registered singletons keyed by componentId */
  readonly singletons: Map<number, AnyEditorSingletonDef> = new Map();
  private storeEventIndex: number = 0;

  constructor(domElement: HTMLElement, options?: EditorOptions) {
    const {
      plugins = [],
      store = null,
      maxEntities = 10_000,
      resources = {},
    } = options ?? {};

    // Sort plugins by dependencies, always including CorePlugin first
    const sortedPlugins = sortPluginsByDependencies([CorePlugin, ...plugins]);

    // Collect all components and singletons from plugins
    // Always include CommandMarker for the command system
    const allDefs: (ComponentDef<any> | SingletonDef<any>)[] = [CommandMarker];
    for (const plugin of sortedPlugins) {
      if (plugin.components) {
        allDefs.push(...plugin.components);
      }
      if (plugin.singletons) {
        allDefs.push(...plugin.singletons);
      }
    }

    // Collect plugin resources
    const pluginResources: Record<string, unknown> = {};
    for (const plugin of sortedPlugins) {
      if (plugin.resources !== undefined) {
        pluginResources[plugin.name] = plugin.resources;
      }
    }

    // Create ECS World with editor resources
    // Note: We pass a placeholder for 'editor' and update it after construction
    const allResources: EditorResources & Record<string, unknown> = {
      ...resources,
      domElement,
      editor: null as unknown as Editor, // Will be set below
      pluginResources,
    };

    this.world = new World(allDefs, {
      maxEntities,
      resources: allResources,
    });

    // Now set the editor reference in resources
    allResources.editor = this;

    // Initialize phases
    this.phases = new Map();
    for (const phase of PHASE_ORDER) {
      this.phases.set(phase, []);
    }

    // Register systems from plugins
    for (const plugin of sortedPlugins) {
      if (plugin.preInputSystems) {
        this.phases.get("preInput")!.push(...plugin.preInputSystems);
      }
      if (plugin.inputSystems) {
        this.phases.get("input")!.push(...plugin.inputSystems);
      }
      if (plugin.postInputSystems) {
        this.phases.get("postInput")!.push(...plugin.postInputSystems);
      }
      if (plugin.preCaptureSystems) {
        this.phases.get("preCapture")!.push(...plugin.preCaptureSystems);
      }
      if (plugin.captureSystems) {
        this.phases.get("capture")!.push(...plugin.captureSystems);
      }
      if (plugin.postCaptureSystems) {
        this.phases.get("postCapture")!.push(...plugin.postCaptureSystems);
      }
      if (plugin.preUpdateSystems) {
        this.phases.get("preUpdate")!.push(...plugin.preUpdateSystems);
      }
      if (plugin.updateSystems) {
        this.phases.get("update")!.push(...plugin.updateSystems);
      }
      if (plugin.postUpdateSystems) {
        this.phases.get("postUpdate")!.push(...plugin.postUpdateSystems);
      }
      if (plugin.preRenderSystems) {
        this.phases.get("preRender")!.push(...plugin.preRenderSystems);
      }
      if (plugin.renderSystems) {
        this.phases.get("render")!.push(...plugin.renderSystems);
      }
      if (plugin.postRenderSystems) {
        this.phases.get("postRender")!.push(...plugin.postRenderSystems);
      }
    }

    // Store plugins
    this.plugins = new Map(sortedPlugins.map((p) => [p.name, p]));

    // Store adapter
    this.store = store;

    // Build maps of all components/singletons
    for (const plugin of sortedPlugins) {
      if (plugin.components) {
        for (const comp of plugin.components) {
          const componentId = comp._getComponentId(this.ctx);
          this.components.set(componentId, comp);
        }
      }
      if (plugin.singletons) {
        for (const singleton of plugin.singletons) {
          const componentId = singleton._getComponentId(this.ctx);
          this.singletons.set(componentId, singleton);
        }
      }
    }
  }

  /**
   * Get the ECS context.
   * Use this to access ECS functions and resources.
   */
  private get ctx(): Context {
    return this.world._getContext();
  }

  /**
   * Initialize the editor.
   * Call this after construction to run async setup.
   */
  async initialize(): Promise<void> {
    // Initialize store with synced component/singleton defs
    if (this.store) {
      const syncedComponents = [...this.components.values()].filter(
        (def) => def.__editor.sync !== "none"
      );
      const syncedSingletons = [...this.singletons.values()].filter(
        (def) => def.__editor.sync !== "none"
      );
      await this.store.initialize(syncedComponents, syncedSingletons);
    }

    // Run plugin setup
    for (const plugin of this.plugins.values()) {
      if (plugin.setup) {
        await plugin.setup(this.ctx);
      }
    }
  }

  /**
   * Run one frame of the editor loop.
   *
   * Executes systems in phase order:
   * 1. Input - convert raw events to ECS state
   * 2. Capture - detect targets, compute intersections
   * 3. Update - modify document state, process commands
   * 4. Render - sync ECS state to output
   *
   * Commands spawned via `command()` are available during this frame
   * and automatically cleaned up at the end.
   */
  async tick(): Promise<void> {
    // Process scheduled callbacks (including command spawns)
    this.world.sync();

    // Execute phases in order
    for (const phase of PHASE_ORDER) {
      await this.executePhase(phase);
    }

    // Clean up command entities at end of frame
    cleanupCommands(this.ctx);

    if (this.store) {
      // Sync local ECS changes to the store
      this.syncToStore(this.storeEventIndex);

      // Flush external changes (undo/redo, network sync) from store to ECS
      this.store.flushChanges(this.ctx);

      // Advance past flushChanges events so they don't get synced back to store
      this.storeEventIndex = this.ctx.eventBuffer.getWriteIndex();
    }
  }

  /**
   * Read events from the event buffer and sync components/singletons to the store.
   * The store handles routing to document or ephemeral storage based on sync type.
   */
  private syncToStore(eventIndex: number): void {
    if (!this.store) return;

    const ctx = this.ctx;
    const { events } = ctx.eventBuffer.readEvents(eventIndex);

    if (events.length === 0) return;

    for (const event of events) {
      const { entityId, eventType, componentId } = event;

      // Check if this is a synced component or singleton
      const componentDef = this.components.get(componentId);
      const singletonDef = this.singletons.get(componentId);

      // Skip if not a synced component/singleton (sync === "none")
      const isSyncedComponent =
        componentDef && componentDef.__editor.sync !== "none";
      const isSyncedSingleton =
        singletonDef && singletonDef.__editor.sync !== "none";
      if (!isSyncedComponent && !isSyncedSingleton) {
        continue;
      }

      // Skip entity events if the entity doesn't have the Synced component
      // (required for stable ID lookup)
      if (
        entityId !== SINGLETON_ENTITY_ID &&
        !hasComponent(ctx, entityId, Synced, false)
      ) {
        continue;
      }

      switch (eventType) {
        case EventType.COMPONENT_ADDED: {
          if (isSyncedComponent) {
            const id = Synced.read(ctx, entityId).id;
            const data = componentDef.snapshot(ctx, entityId);
            this.store.onComponentAdded(componentDef, id, entityId, data);
          }
          break;
        }

        case EventType.COMPONENT_REMOVED: {
          if (isSyncedComponent) {
            const id = Synced.read(ctx, entityId).id;
            this.store.onComponentRemoved(componentDef, id);
          }
          break;
        }

        case EventType.REMOVED: {
          // Entity removed - notify store to remove all data for this entity
          // Component data is still preserved after markDead, so we can read it
          const id = Synced.read(ctx, entityId).id;
          for (const cId of ctx.entityBuffer.getComponentIds(entityId)) {
            const compDef = this.components.get(cId);
            if (compDef && compDef.__editor.sync !== "none") {
              this.store.onComponentRemoved(compDef, id);
            }
          }
          break;
        }

        case EventType.CHANGED: {
          if (entityId === SINGLETON_ENTITY_ID && isSyncedSingleton) {
            const data = singletonDef.snapshot(ctx);
            this.store.onSingletonUpdated(singletonDef, data);
          } else if (isSyncedComponent) {
            const id = Synced.read(ctx, entityId).id;
            const data = componentDef.snapshot(ctx, entityId);
            this.store.onComponentUpdated(componentDef, id, data);
          }
          break;
        }
      }
    }

    // Commit all changes at end of frame
    this.store.commit();
  }

  /**
   * Execute all systems in a phase
   */
  private async executePhase(phase: SystemPhase): Promise<void> {
    const systems = this.phases.get(phase);
    if (!systems || systems.length === 0) return;

    await this.world.execute(...systems);
  }

  /**
   * Schedule work for the next tick.
   * Use this from event handlers to safely modify ECS state.
   *
   * @param callback - Function to execute at next tick
   *
   * @example
   * ```typescript
   * element.addEventListener('click', () => {
   *   editor.nextTick((ctx) => {
   *     const block = Block.write(ctx, entityId);
   *     block.selected = true;
   *   });
   * });
   * ```
   */
  nextTick(callback: (ctx: Context) => void): void {
    this.world.nextSync((ctx) => {
      callback(ctx);
    });
  }

  /**
   * Spawn a command to be processed this frame.
   * Commands are ephemeral entities that systems can react to via `CommandDef.iter()`.
   *
   * @param def - The command definition created with `defineCommand()`
   * @param payload - Command payload data
   *
   * @example
   * ```typescript
   * const SelectAll = defineCommand<{ filter?: string }>("select-all");
   *
   * // From UI event handler
   * editor.command(SelectAll, { filter: "blocks" });
   * ```
   */
  command<T>(def: CommandDef<T>, ...args: T extends void ? [] : [T]): void {
    const payload = args[0] as T;
    this.nextTick((ctx) => {
      def.spawn(ctx, payload);
    });
  }

  /**
   * Subscribe to query changes.
   *
   * @param query - Query definition
   * @param callback - Called when query results change
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = editor.subscribe(selectedBlocks, (ctx, { added, removed }) => {
   *   console.log('Selection changed:', added, removed);
   * });
   *
   * // Later:
   * unsubscribe();
   * ```
   */
  subscribe(query: QueryDef, callback: QueryCallback): () => void {
    return this.world.subscribe(query, (ctx, result) => {
      callback(ctx, result);
    });
  }

  /**
   * Get the ECS context.
   * Only for testing and advanced use cases.
   * @internal
   */
  _getContext(): Context {
    return this.ctx;
  }

  /**
   * Clean up the editor.
   * Call this when done to release resources.
   */
  dispose(): void {
    // Run plugin teardown in reverse order
    const plugins = Array.from(this.plugins.values()).reverse();
    for (const plugin of plugins) {
      if (plugin.teardown) {
        plugin.teardown(this.ctx);
      }
    }

    // Dispose ECS World
    this.world.dispose();

    // Clear state
    this.plugins.clear();
    this.phases.clear();
  }
}
