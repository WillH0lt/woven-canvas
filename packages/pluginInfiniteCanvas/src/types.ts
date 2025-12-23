import { z } from "zod";

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
