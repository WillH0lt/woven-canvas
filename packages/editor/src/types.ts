import type { Context, EntityId } from "@infinitecanvas/ecs";
export type { Context };
import { z } from "zod";
import type { Editor } from "./Editor";
import type { EditorPluginInput } from "./plugin";
import type { StoreAdapter } from "./store";

// Re-export EntityId for convenience
export type { EntityId };

/**
 * Base resources required by the Editor.
 * Plugins can extend this interface for additional resources.
 *
 * @example
 * ```typescript
 * interface MyPluginResources extends EditorResources {
 *   apiClient: ApiClient;
 * }
 * ```
 */
export interface EditorResources {
  /**
   * The DOM element to attach input listeners and render output to.
   * This should be the editor's main container or canvas element.
   */
  domElement: HTMLElement;

  /**
   * Reference to the Editor instance.
   * Use this to spawn commands, subscribe to queries, etc.
   */
  editor: Editor;

  /**
   * Plugin-specific resources keyed by plugin name.
   * Access via getPluginResources<T>(ctx, pluginName).
   * @internal Populated automatically from plugin.resources
   */
  pluginResources: Record<string, unknown>;
}

/**
 * Sync determines how component changes propagate
 */
export type SyncBehavior =
  | "document" // Persisted to database, synced to all clients
  | "ephemeral" // Synced via websocket for ephemeral (cursors, selections)
  | "none"; // Not synced or stored anywhere

/**
 * Editor metadata attached to component definitions
 */
export interface EditorComponentMeta {
  sync: SyncBehavior;
}

export type SystemPhase =
  | "preInput"
  | "input"
  | "postInput"
  | "preCapture"
  | "capture"
  | "postCapture"
  | "preUpdate"
  | "update"
  | "postUpdate"
  | "preRender"
  | "render"
  | "postRender";

/**
 * Get plugin-specific resources from the context.
 *
 * @typeParam T - The expected plugin resources type
 * @param ctx - The ECS context
 * @param pluginName - The plugin name to get resources for
 * @returns The plugin resources cast to type T
 *
 * @example
 * ```typescript
 * interface ControlsOptions {
 *   zoomSpeed: number;
 *   panSpeed: number;
 * }
 *
 * const ControlsPlugin: EditorPlugin<ControlsOptions> = {
 *   name: "controls",
 *   resources: { zoomSpeed: 1.0, panSpeed: 1.0 },
 *   // ...
 * };
 *
 * // In a system:
 * function mySystem(ctx: Context) {
 *   const opts = getPluginResources<ControlsOptions>(ctx, "controls");
 *   console.log(opts.zoomSpeed);
 * }
 * ```
 */
export function getPluginResources<T>(ctx: Context, pluginName: string): T {
  const resources = ctx.resources as EditorResources;
  return resources.pluginResources[pluginName] as T;
}

/**
 * Editor configuration options schema.
 */
export const EditorOptionsSchema = z.object({
  /**
   * Plugins to load.
   * Plugins are sorted by dependencies automatically.
   */
  plugins: z.array(z.custom<EditorPluginInput>()).default([]),

  /**
   * Store adapter for persistence and sync.
   */
  store: z.custom<StoreAdapter>().optional(),

  /**
   * Maximum number of entities.
   * @default 10_000
   */
  maxEntities: z.number().default(10_000),

  /**
   * Additional custom resources accessible via getResources(ctx).
   * These are merged with the base EditorResources (which includes domElement and editor).
   */
  resources: z.record(z.string(), z.unknown()).default({}),

  /**
   * Exclude the default CorePlugin.
   * Set to true for isolated testing of individual systems.
   * @default false
   */
  excludeCorePlugin: z.boolean().default(false),
});

export type EditorOptionsInput = z.input<typeof EditorOptionsSchema>;

export type EditorOptions = z.infer<typeof EditorOptionsSchema>;

/**
 * Keybind definition schema.
 * Maps a key combination to a command.
 */
export const Keybind = z.object({
  /** The command to execute when this keybind is triggered */
  command: z.string(),
  /** The key index from the Key constants (e.g., Key.A, Key.Delete) */
  key: z.number(),
  /** Whether the modifier key (Cmd on Mac, Ctrl on Windows) must be held */
  mod: z.boolean().optional(),
  /** Whether the Shift key must be held */
  shift: z.boolean().optional(),
});

export type Keybind = z.infer<typeof Keybind>;
export type KeybindInput = z.input<typeof Keybind>;

/**
 * State for selection state machine.
 */
export enum SelectionState {
  Idle = "idle",
  Pointing = "pointing",
  Dragging = "dragging",
  SelectionBoxPointing = "selectionBoxPointing",
  SelectionBoxDragging = "selectionBoxDragging",
}

/**
 * State for transform box state machine.
 */
export enum TransformBoxState {
  None = "none",
  Idle = "idle",
  Editing = "editing",
}

/**
 * Kind of transform handle (corner, edge, rotation).
 */
export enum TransformHandleKind {
  Scale = "scale",
  Stretch = "stretch",
  Rotate = "rotate",
}

/**
 * Cursor kinds for transform operations.
 */
export enum CursorKind {
  Drag = "drag",
  NESW = "nesw",
  NWSE = "nwse",
  NS = "ns",
  EW = "ew",
  RotateNW = "rotateNW",
  RotateNE = "rotateNE",
  RotateSW = "rotateSW",
  RotateSE = "rotateSE",
}

/**
 * Cursor definition type.
 * Defines how to generate the cursor SVG at a given rotation.
 */
export interface CursorDef {
  /** Function that generates the SVG string for a given rotation angle (in radians) */
  makeSvg: (rotation: number) => string;
  /** Hotspot coordinates [x, y] for the cursor */
  hotspot: [number, number];
  /** Base rotation offset applied before the dynamic rotation */
  rotationOffset: number;
}

/**
 * Map of cursor kind to cursor definition.
 */
export type CursorDefMap = Partial<Record<string, CursorDef>>;

/**
 * Block resize modes.
 */
export type ResizeMode = "scale" | "text" | "free" | "groupOnly";

/**
 * Text alignment options.
 */
export enum TextAlign {
  Left = "left",
  Center = "center",
  Right = "right",
  Justify = "justify",
}

/**
 * Vertical alignment options.
 */
export enum VerticalAlign {
  Top = "top",
  Center = "center",
  Bottom = "bottom",
}

/**
 * Block definition edit options schema.
 */
const BlockDefEditOptions = z.object({
  canEdit: z.boolean().default(false),
  removeWhenTextEmpty: z.boolean().default(false),
});

/**
 * Block definition schema with validation and defaults.
 * Defines how different block types behave (editing, resizing, rotation, etc.)
 */
export const BlockDef = z.object({
  tag: z.string(),
  editOptions: BlockDefEditOptions.default(BlockDefEditOptions.parse({})),
  resizeMode: z.enum(["scale", "text", "free", "groupOnly"]).default("scale"),
  canRotate: z.boolean().default(true),
  canScale: z.boolean().default(true),
  noHtml: z.boolean().default(false),
});

/**
 * Input type for block definitions (what users provide).
 * All fields except `tag` are optional.
 */
export type BlockDefInput = z.input<typeof BlockDef>;

/**
 * Normalized block definition type (after parsing with defaults applied).
 */
export type BlockDef = z.infer<typeof BlockDef>;

/**
 * Map of block tag to normalized block definition.
 */
export type BlockDefMap = Record<string, BlockDef>;

/**
 * Plugin options schema for the Infinite Canvas plugin.
 */
export const InfiniteCanvasPluginOptionsSchema = z.object({
  /**
   * Custom block definitions.
   * These define how different block types behave (editing, resizing, rotation, etc.)
   */
  customBlocks: z.array(BlockDef).default([]),

  /**
   * Keybind definitions for keyboard shortcuts.
   * These map key combinations to plugin commands.
   */
  keybinds: z.array(Keybind).optional(),

  /**
   * Unique user identifier for presence tracking.
   * If not provided, a crypto UUID will be generated.
   */
  userId: z.string().optional(),

  /**
   * Custom cursor definitions.
   * Override default cursors or define new ones for transform operations.
   * Keys are CursorKind values, values are CursorDef objects.
   */
  cursors: z.record(z.string(), z.custom<CursorDef>()).optional(),
});

/**
 * Input type for plugin options (what users provide).
 */
export type InfiniteCanvasPluginOptionsInput = z.input<
  typeof InfiniteCanvasPluginOptionsSchema
>;

/**
 * Normalized plugin options type (after parsing with defaults applied).
 */
export type InfiniteCanvasPluginOptions = z.infer<
  typeof InfiniteCanvasPluginOptionsSchema
>;

/**
 * Resources for the Infinite Canvas plugin.
 * Access via getPluginResources<InfiniteCanvasResources>(ctx, PLUGIN_NAME).
 */
export interface InfiniteCanvasResources {
  sessionId: string;
  userId: string;
  blockDefs: BlockDefMap;
  keybinds: Keybind[];
  cursors: CursorDefMap;
}
