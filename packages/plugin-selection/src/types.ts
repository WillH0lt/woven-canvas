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
