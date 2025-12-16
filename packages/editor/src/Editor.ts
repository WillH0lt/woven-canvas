import {
  World,
  type Context,
  type QueryDef,
  ComponentDef,
  type System,
  type SingletonDef,
} from "@infinitecanvas/ecs";

import type { EditorResources, SystemPhase } from "./types";
import type { StoreAdapter } from "./store";
import { type EditorPlugin, sortPluginsByDependencies } from "./plugin";
import { CommandMarker, cleanupCommands, type CommandDef } from "./command";

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
const PHASE_ORDER: SystemPhase[] = ["input", "capture", "update", "render"];

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

  constructor(domElement: HTMLElement, options?: EditorOptions) {
    const {
      plugins = [],
      store = null,
      maxEntities = 10_000,
      resources = {},
    } = options ?? {};

    // Sort plugins by dependencies
    const sortedPlugins = sortPluginsByDependencies(plugins);

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

    // Create ECS World with editor resources
    // Note: We pass a placeholder for 'editor' and update it after construction
    const allResources: EditorResources & Record<string, unknown> = {
      ...resources,
      domElement,
      editor: null as unknown as Editor, // Will be set below
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
      if (plugin.inputSystems) {
        this.phases.get("input")!.push(...plugin.inputSystems);
      }
      if (plugin.captureSystems) {
        this.phases.get("capture")!.push(...plugin.captureSystems);
      }
      if (plugin.updateSystems) {
        this.phases.get("update")!.push(...plugin.updateSystems);
      }
      if (plugin.renderSystems) {
        this.phases.get("render")!.push(...plugin.renderSystems);
      }
    }

    // Store plugins
    this.plugins = new Map(sortedPlugins.map((p) => [p.name, p]));

    // Store adapter
    this.store = store;
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
    // Load initial state from store
    if (this.store?.load) {
      const snapshot = await this.store.load();
      // TODO: Hydrate entities from snapshot
      console.log("Loaded snapshot:", snapshot);
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
   */
  _getContext(): Context {
    return this.ctx;
  }

  /**
   * Clean up the editor.
   * Call this when done to release resources.
   */
  async dispose(): Promise<void> {
    // Run plugin teardown in reverse order
    const plugins = Array.from(this.plugins.values()).reverse();
    for (const plugin of plugins) {
      if (plugin.teardown) {
        await plugin.teardown(this.ctx);
      }
    }

    // Dispose ECS World
    this.world.dispose();

    // Clear state
    this.plugins.clear();
    this.phases.clear();
  }
}
