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
 * Block definition for custom block types.
 */
export interface BlockDef {
  tag: string;
  editOptions?: {
    canEdit?: boolean;
    removeWhenTextEmpty?: boolean;
  };
  resizeMode?: ResizeMode;
  canRotate?: boolean;
  canScale?: boolean;
  noHtml?: boolean;
}
