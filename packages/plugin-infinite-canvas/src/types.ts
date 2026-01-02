import { EditorComponentDef } from "@infinitecanvas/editor";
import { z } from "zod";

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
 * Cursor definition schema.
 * Defines how to generate the cursor SVG at a given rotation.
 */
export const CursorDef = z.object({
  /** Function that generates the SVG string for a given rotation angle (in radians) */
  makeSvg: z.function().args(z.number()).returns(z.string()),
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
  components: z.array(z.custom<EditorComponentDef<any>>()).default([]),
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
  cursors: z.record(z.string(), CursorDef).optional(),
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
