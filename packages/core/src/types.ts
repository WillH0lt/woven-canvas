import type { Context, EntityId } from "@woven-ecs/core";
export type { Context };
import { z } from "zod";
import {
  type AnyCanvasComponentDef,
  type AnyCanvasSingletonDef,
} from "@woven-ecs/canvas-store";

import type { Editor } from "./Editor";
import type { EditorPluginInput } from "./plugin";
import type { EditorSystem } from "./EditorSystem";
import type { FontFamilyInput } from "./FontLoader";

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
/**
 * Generate a random user color from a predefined palette.
 */
function generateUserColor(): string {
  const colors = [
    "#f43f5e", // rose
    "#ec4899", // pink
    "#a855f7", // purple
    "#6366f1", // indigo
    "#3b82f6", // blue
    "#0ea5e9", // sky
    "#14b8a6", // teal
    "#22c55e", // green
    "#eab308", // yellow
    "#f97316", // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * User data for presence tracking.
 */
export const UserData = z.object({
  userId: z
    .string()
    .max(36)
    .default(() => crypto.randomUUID()),
  sessionId: z
    .string()
    .max(36)
    .default(() => crypto.randomUUID()),
  color: z.string().max(7).default(generateUserColor),
  name: z.string().max(100).default("Anonymous"),
  avatar: z.string().max(500).default(""),
});

export type UserData = z.infer<typeof UserData>;

export type UserDataInput = z.input<typeof UserData>;

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
   * User identity for the current session.
   * Only stores userId and sessionId - other user data (color, name, avatar)
   * should be read from the ECS User component.
   */
  userId: string;
  sessionId: string;

  /**
   * Plugin-specific resources keyed by plugin name.
   * Access via getPluginResources<T>(ctx, pluginName).
   * @internal Populated automatically from plugin.resources
   */
  pluginResources: Record<string, unknown>;

  /**
   * All registered components keyed by name.
   * Use this for fast component lookup by name (e.g., from snapshots).
   */
  componentsByName: Map<string, AnyCanvasComponentDef>;

  /**
   * All registered singletons keyed by name.
   * Use this for fast singleton lookup by name.
   */
  singletonsByName: Map<string, AnyCanvasSingletonDef>;

  /**
   * All registered components keyed by componentId.
   * Use this for component lookup by runtime id (e.g., from events).
   */
  componentsById: Map<number, AnyCanvasComponentDef>;

  /**
   * All registered singletons keyed by componentId.
   * Use this for singleton lookup by runtime id (e.g., from events).
   */
  singletonsById: Map<number, AnyCanvasSingletonDef>;
}

/**
 * System execution phases.
 *
 * Systems are grouped into 4 phases that execute in order each frame:
 * 1. **input** - Convert raw DOM events to ECS state (keyboard, mouse, pointer, screen)
 * 2. **capture** - Detect targets, compute intersections, process keybinds
 * 3. **update** - Modify document state, process commands
 * 4. **render** - Sync ECS state to output (DOM, canvas)
 *
 * Within each phase, systems are sorted by priority (higher = runs first).
 * Ties are broken by registration order.
 */
export type SystemPhase = "input" | "capture" | "update" | "render";

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
 * const CanvasControlsPlugin: EditorPlugin<ControlsOptions> = {
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
 * Grid configuration options schema.
 */
export const GridOptions = z.object({
  /**
   * Whether grid snapping is enabled.
   * @default false
   */
  enabled: z.boolean().default(false),

  /**
   * Whether resized/rotated objects must stay aligned to the grid.
   * If true, objects snap to grid during resize/rotate.
   * If false, objects scale proportionally to the transform box, which may
   * cause them to be unaligned with the grid.
   * @default false
   */
  strict: z.boolean().default(false),

  /**
   * Width of each grid column in world units.
   * @default 20
   */
  colWidth: z.number().nonnegative().default(20),

  /**
   * Height of each grid row in world units.
   * @default 20
   */
  rowHeight: z.number().nonnegative().default(20),

  /**
   * Angular snap increment in radians when grid is enabled.
   * @default Math.PI / 36 (5 degrees)
   */
  snapAngleRad: z
    .number()
    .nonnegative()
    .default(Math.PI / 36),

  /**
   * Angular snap increment in radians when shift key is held.
   * @default Math.PI / 12 (15 degrees)
   */
  shiftSnapAngleRad: z
    .number()
    .nonnegative()
    .default(Math.PI / 12),
});

export type GridOptions = z.infer<typeof GridOptions>;
export type GridOptionsInput = z.input<typeof GridOptions>;

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
   * Maximum number of entities.
   * @default 5_000
   */
  maxEntities: z.number().default(5_000),

  /**
   * User data for presence tracking.
   * All fields are optional - defaults will be applied.
   */
  user: z.custom<UserDataInput>().default({}),

  /**
   * Grid configuration for snap-to-grid behavior.
   * All fields are optional - defaults will be applied.
   */
  grid: z.custom<GridOptionsInput>().default({}),

  /**
   * Custom block definitions.
   * Accepts partial block definitions - defaults will be applied automatically.
   */
  blockDefs: z.array(z.custom<BlockDefInput>()).default([]),

  /**
   * Keybind definitions for keyboard shortcuts.
   * These map key combinations to plugin commands.
   */
  keybinds: z.array(z.custom<Keybind>()).default([]),

  /**
   * Custom cursor definitions.
   * Override default cursors or define new ones for transform operations.
   */
  cursors: z.record(z.string(), z.custom<CursorDef>()).default({}),

  /**
   * Custom components to register without creating a plugin.
   */
  components: z.array(z.custom<AnyCanvasComponentDef>()).default([]),

  /**
   * Custom singletons to register without creating a plugin.
   */
  singletons: z.array(z.custom<AnyCanvasSingletonDef>()).default([]),

  /**
   * Custom systems to register without creating a plugin.
   * Each system specifies its phase and priority.
   */
  systems: z.array(z.custom<EditorSystem>()).default([]),

  /**
   * Custom font families to load and make available in the font selector.
   * Fonts will be loaded automatically during editor initialization.
   */
  fonts: z.array(z.custom<FontFamilyInput>()).default([]),

  /**
   * If true, keybinds from plugins will be ignored.
   * Use this when you want full control over keybinds.
   */
  omitPluginKeybinds: z.boolean().default(false),

  /**
   * If true, cursors from plugins will be ignored.
   * Use this when you want full control over cursors.
   */
  omitPluginCursors: z.boolean().default(false),

  /**
   * If true, fonts from plugins will be ignored.
   * Use this when you want full control over fonts.
   */
  omitPluginFonts: z.boolean().default(false),
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
 * Cursor definition schema.
 * Defines how to generate the cursor SVG at a given rotation.
 */
export const CursorDef = z.object({
  /** Function that generates the SVG string for a given rotation angle (in radians) */
  makeSvg: z.function({ input: z.tuple([z.number()]), output: z.string() }),
  /** Hotspot coordinates [x, y] for the cursor */
  hotspot: z.tuple([z.number(), z.number()]),
  /** Base rotation offset applied before the dynamic rotation */
  rotationOffset: z.number(),
});

export type CursorDef = z.infer<typeof CursorDef>;

/**
 * Map of cursor kind to cursor definition.
 */
export type CursorDefMap = Partial<Record<string, CursorDef>>;

/**
 * Block resize modes.
 */
export type ResizeMode = "scale" | "text" | "free" | "groupOnly";

export const VerticalAlignment = {
  Top: "top",
  Center: "center",
  Bottom: "bottom",
} as const;

export const TextAlignment = {
  Left: "left",
  Center: "center",
  Right: "right",
  Justify: "justify",
} as const;

export type TextAlignment = (typeof TextAlignment)[keyof typeof TextAlignment];

/**
 * Block definition edit options schema.
 */
const BlockDefEditOptions = z.object({
  canEdit: z.boolean().default(false),
  removeWhenTextEmpty: z.boolean().default(false),
});

/**
 * Block definition connectors schema.
 * Defines connector terminals for arrows/links.
 */
const BlockDefConnectors = z.object({
  /** Whether connectors are enabled for this block type */
  enabled: z.boolean().default(true),
  /** UV coordinates of terminal positions (0-1 range, where [0,0] is top-left) */
  terminals: z.array(z.tuple([z.number(), z.number()])).default([
    [0.5, 0], // top
    [0.5, 1], // bottom
    [0.5, 0.5], // center
    [0, 0.5], // left
    [1, 0.5], // right
  ]),
});

/**
 * Block definition schema with validation and defaults.
 * Defines how different block types behave (editing, resizing, rotation, etc.)
 */
export const Stratum = z.enum(["background", "content", "overlay"]);
export type Stratum = z.infer<typeof Stratum>;

export const BlockDef = z.object({
  tag: z.string(),
  stratum: Stratum.default("content"),
  editOptions: BlockDefEditOptions.default(BlockDefEditOptions.parse({})),
  components: z.array(z.custom<AnyCanvasComponentDef>()).default([]),
  resizeMode: z.enum(["scale", "text", "free", "groupOnly"]).default("scale"),
  canRotate: z.boolean().default(true),
  canScale: z.boolean().default(true),
  connectors: BlockDefConnectors.default(BlockDefConnectors.parse({})),
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
