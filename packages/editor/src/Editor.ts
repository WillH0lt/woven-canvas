import { World, type QueryDef, type Context } from "@infinitecanvas/ecs";
import type {
  EditorComponentDef,
  EditorSingletonDef,
  EditorContext,
} from "./types";
import type { SystemPhase, PhaseSystem } from "./phase";
import { PHASE_ORDER } from "./phase";
import type { StoreAdapter } from "./store";
import { type EditorPlugin, sortPluginsByDependencies } from "./plugin";

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
   * Custom resources accessible via getResources(ctx).
   */
  resources?: unknown;
}

/**
 * Query subscription callback
 */
export type QueryCallback = (
  ctx: EditorContext,
  result: {
    added: number[];
    changed: number[];
    removed: number[];
  }
) => void;

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
 * const editor = new Editor({
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
  private phases: Map<SystemPhase, PhaseSystem[]>;
  private plugins: Map<string, EditorPlugin>;
  private store: StoreAdapter | null;
  private editorContext: EditorContext | null = null;

  constructor(options: EditorOptions = {}) {
    const {
      plugins = [],
      store = null,
      maxEntities = 10_000,
      resources,
    } = options;

    // Sort plugins by dependencies
    const sortedPlugins = sortPluginsByDependencies(plugins);

    // Collect all components and singletons from plugins
    const allDefs: (EditorComponentDef | EditorSingletonDef)[] = [];
    for (const plugin of sortedPlugins) {
      if (plugin.components) {
        allDefs.push(...plugin.components);
      }
      if (plugin.singletons) {
        allDefs.push(...plugin.singletons);
      }
    }

    // Create ECS World
    this.world = new World(allDefs, {
      maxEntities,
      resources,
    });

    // Initialize phases
    this.phases = new Map();
    for (const phase of PHASE_ORDER) {
      this.phases.set(phase, []);
    }

    // Register systems from plugins
    for (const plugin of sortedPlugins) {
      if (plugin.systems) {
        for (const system of plugin.systems) {
          const phaseSystems = this.phases.get(system.phase);
          if (phaseSystems) {
            phaseSystems.push(system);
          }
        }
      }
    }

    // Store plugins
    this.plugins = new Map(sortedPlugins.map((p) => [p.name, p]));

    // Store adapter
    this.store = store;
  }

  /**
   * Initialize the editor.
   * Call this after construction to run async setup.
   */
  async initialize(): Promise<void> {
    // Create editor context by extending the ECS context
    const ecsContext = this.world._getContext();
    this.editorContext = Object.assign(Object.create(ecsContext), {
      editor: this,
    }) as EditorContext;

    // Load initial state from store
    if (this.store?.load) {
      const snapshot = await this.store.load();
      // TODO: Hydrate entities from snapshot
      console.log("Loaded snapshot:", snapshot);
    }

    // Run plugin setup
    for (const plugin of this.plugins.values()) {
      if (plugin.setup) {
        await plugin.setup(this);
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
   */
  tick(): void {
    // Process scheduled callbacks
    this.world.sync();

    // Execute phases in order
    for (const phase of PHASE_ORDER) {
      this.executePhase(phase);
    }
  }

  /**
   * Execute all systems in a phase
   */
  private executePhase(phase: SystemPhase): void {
    const systems = this.phases.get(phase);
    if (!systems || !this.editorContext) return;

    for (const system of systems) {
      system.execute(this.editorContext);
    }
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
  nextTick(callback: (ctx: EditorContext) => void): void {
    this.world.nextSync(() => {
      if (this.editorContext) {
        callback(this.editorContext);
      }
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
      if (this.editorContext) {
        callback(this.editorContext, result);
      }
    });
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
        await plugin.teardown(this);
      }
    }

    // Dispose ECS World
    this.world.dispose();

    // Clear state
    this.plugins.clear();
    this.phases.clear();
    this.editorContext = null;
  }
}
