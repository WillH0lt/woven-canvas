import {
  World,
  type Context,
  type QueryDef,
  ComponentDef,
  type SingletonDef,
  EventType,
  SINGLETON_ENTITY_ID,
  hasComponent,
  getResources,
} from "@infinitecanvas/ecs";

import {
  type SystemPhase,
  EditorOptionsSchema,
  type EditorOptionsInput,
  CursorDef,
  Keybind,
  type EditorResources,
  BlockDef,
} from "./types";
import type { StoreAdapter } from "./store";
import {
  type EditorPlugin,
  parsePlugin,
  sortPluginsByDependencies,
} from "./plugin";
import { CommandMarker, cleanupCommands, type CommandDef } from "./command";
import { CorePlugin } from "./CorePlugin";
import type { AnyEditorComponentDef } from "./EditorComponentDef";
import type { AnyEditorSingletonDef } from "./EditorSingletonDef";
import { Synced, Edited } from "./components";
import type { EditorSystem } from "./EditorSystem";
import { FontLoader, FontFamily } from "./FontLoader";

/**
 * Query subscription callback
 */
export type QueryCallback = (
  ctx: Context,
  result: {
    added: number[];
    changed: number[];
    removed: number[];
  },
) => void;

/**
 * Order of system execution phases
 */
const PHASE_ORDER: SystemPhase[] = ["input", "capture", "update", "render"];

/**
 * Batch systems by phase and priority.
 *
 * Returns an array of system batches, sorted by phase order then priority (descending).
 * Systems at the same phase and priority are kept in registration order within their batch.
 *
 * This batching allows systems with lower priority to see `.changed()` and `.added()`
 * query results from systems that ran earlier in the same phase.
 */
function batchSystems(systems: EditorSystem[]): EditorSystem[][] {
  // Group by phase first
  const byPhase = new Map<SystemPhase, EditorSystem[]>();
  for (const phase of PHASE_ORDER) {
    byPhase.set(phase, []);
  }
  for (const system of systems) {
    byPhase.get(system.phase)!.push(system);
  }

  // Then batch each phase by priority and flatten
  const result: EditorSystem[][] = [];
  for (const phase of PHASE_ORDER) {
    const phaseSystems = byPhase.get(phase)!;
    const byPriority = new Map<number, EditorSystem[]>();
    for (const system of phaseSystems) {
      const group = byPriority.get(system.priority) ?? [];
      group.push(system);
      byPriority.set(system.priority, group);
    }

    // Sort priorities descending (higher runs first)
    const priorities = [...byPriority.keys()].sort((a, b) => b - a);
    for (const p of priorities) {
      result.push(byPriority.get(p)!);
    }
  }

  return result;
}

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
  public cursors: Record<string, CursorDef> = {};
  public keybinds: Keybind[];
  public blockDefs: Record<string, BlockDef> = {};
  public fonts: FontFamily[] = [];

  private world: World;
  private systemBatches: EditorSystem[][];
  private plugins: Map<string, EditorPlugin>;
  private store: StoreAdapter | null;
  private storeEventIndex: number = 0;
  private fontLoader: FontLoader;

  constructor(domElement: HTMLElement, optionsInput?: EditorOptionsInput) {
    const options = EditorOptionsSchema.parse(optionsInput ?? {});
    const { plugins: pluginInputs, maxEntities, userId } = options;

    // Generate unique session ID for this editor instance
    const sessionId = crypto.randomUUID();
    // Use provided userId or generate one
    const resolvedUserId = userId ?? crypto.randomUUID();

    // Parse plugin inputs (handle both direct plugins and factory functions)
    const plugins = pluginInputs.map(parsePlugin);

    // Sort plugins by dependencies, always including CorePlugin first
    const sortedPlugins = sortPluginsByDependencies([CorePlugin, ...plugins]);

    // Collect all components and singletons from plugins and custom options
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
    // Add custom components and singletons
    allDefs.push(...options.components);
    allDefs.push(...options.singletons);

    // Setup keybinds
    const keybinds = options.keybinds;
    if (!options.omitPluginKeybinds) {
      for (const plugin of sortedPlugins) {
        if (plugin.keybinds) {
          keybinds.push(...plugin.keybinds);
        }
      }
    }
    this.keybinds = keybinds;

    // Setup block defs (parse inputs to apply defaults)
    const blockDefs: Record<string, BlockDef> = {};
    for (const input of options.blockDefs) {
      const parsed = BlockDef.parse(input);
      blockDefs[parsed.tag] = parsed;
    }
    for (const plugin of sortedPlugins) {
      if (plugin.blockDefs) {
        for (const input of plugin.blockDefs) {
          const parsed = BlockDef.parse(input);
          blockDefs[parsed.tag] = parsed;
        }
      }
    }
    this.blockDefs = blockDefs;

    // Setup cursors
    const cursors: Record<string, CursorDef> = {};
    Object.assign(cursors, options.cursors);
    if (!options.omitPluginCursors) {
      for (const plugin of sortedPlugins) {
        if (plugin.cursors) {
          Object.assign(cursors, plugin.cursors);
        }
      }
    }
    this.cursors = cursors;

    // Setup fonts (parse inputs to apply defaults, merge from plugins)
    this.fontLoader = new FontLoader();
    const fontInputs = [...options.fonts];
    if (!options.omitPluginFonts) {
      for (const plugin of sortedPlugins) {
        if (plugin.fonts) {
          fontInputs.push(...plugin.fonts);
        }
      }
    }
    this.fonts = fontInputs.map((input) => FontFamily.parse(input));

    // Collect plugin resources
    const pluginResources: Record<string, unknown> = {};
    for (const plugin of sortedPlugins) {
      if (plugin.resources !== undefined) {
        pluginResources[plugin.name] = plugin.resources;
      }
    }

    // Build component/singleton maps for resources
    const componentsByName = new Map<string, AnyEditorComponentDef>();
    const singletonsByName = new Map<string, AnyEditorSingletonDef>();
    const componentsById = new Map<number, AnyEditorComponentDef>();
    const singletonsById = new Map<number, AnyEditorSingletonDef>();

    // Store adapter
    this.store = options.store ?? null;

    // Create ECS World with editor resources
    const allResources: EditorResources = {
      domElement,
      editor: this,
      sessionId,
      userId: resolvedUserId,
      pluginResources,
      componentsByName,
      singletonsByName,
      componentsById,
      singletonsById,
      store: this.store,
    };

    this.world = new World(allDefs, {
      maxEntities,
      resources: allResources,
    });

    // Collect all systems
    const allSystems: EditorSystem[] = [];

    // Register systems from plugins (order matters for stable tie-breaking)
    for (const plugin of sortedPlugins) {
      if (plugin.systems) {
        allSystems.push(...plugin.systems);
      }
    }

    // Register custom systems
    allSystems.push(...options.systems);

    // Batch systems by phase and priority
    this.systemBatches = batchSystems(allSystems);

    // Build map of plugins
    this.plugins = new Map(sortedPlugins.map((p) => [p.name, p]));

    // Build maps of all components/singletons (by id and by name)
    for (const plugin of sortedPlugins) {
      if (plugin.components) {
        for (const comp of plugin.components) {
          const componentId = comp._getComponentId(this.ctx);
          componentsById.set(componentId, comp);
          componentsByName.set(comp.name, comp);
        }
      }
      if (plugin.singletons) {
        for (const singleton of plugin.singletons) {
          const componentId = singleton._getComponentId(this.ctx);
          singletonsById.set(componentId, singleton);
          singletonsByName.set(singleton.name, singleton);
        }
      }
    }
    // Add custom components and singletons to maps
    for (const comp of options.components) {
      const componentId = comp._getComponentId(this.ctx);
      componentsById.set(componentId, comp);
      componentsByName.set(comp.name, comp);
    }
    for (const singleton of options.singletons) {
      const componentId = singleton._getComponentId(this.ctx);
      singletonsById.set(componentId, singleton);
      singletonsByName.set(singleton.name, singleton);
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
      const { componentsById, singletonsById } = getResources<EditorResources>(
        this.ctx,
      );
      const syncedComponents = [...componentsById.values()].filter(
        (def) => def.__editor.sync !== "none",
      );
      const syncedSingletons = [...singletonsById.values()].filter(
        (def) => def.__editor.sync !== "none",
      );
      await this.store.initialize(syncedComponents, syncedSingletons);
    }

    // Load custom fonts
    if (this.fonts.length > 0) {
      await this.fontLoader.loadFonts(this.fonts);
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

    // Execute system batches in order (already sorted by phase then priority)
    for (const batch of this.systemBatches) {
      const systems = batch.map((s) => s._system);
      await this.world.execute(...systems);
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

    const { componentsById, singletonsById } =
      getResources<EditorResources>(ctx);

    for (const event of events) {
      const { entityId, eventType, componentId } = event;

      // Check if this is a synced component or singleton
      const componentDef = componentsById.get(componentId);
      const singletonDef = singletonsById.get(componentId);

      const isSyncedComponent =
        componentDef && componentDef.__editor.sync !== "none";
      const isSyncedSingleton =
        singletonDef && singletonDef.__editor.sync !== "none";

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
            const compDef = componentsById.get(cId);
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
  nextTick(callback: (ctx: Context) => void): () => void {
    return this.world.nextSync((ctx) => {
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
    this.systemBatches = [];
  }
}
