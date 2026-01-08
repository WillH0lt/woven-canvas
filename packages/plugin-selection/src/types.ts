/**
 * State for selection state machine.
 */
export const SelectionState = {
  Idle: "idle",
  Pointing: "pointing",
  Dragging: "dragging",
  SelectionBoxPointing: "selectionBoxPointing",
  SelectionBoxDragging: "selectionBoxDragging",
} as const;

export type SelectionState =
  (typeof SelectionState)[keyof typeof SelectionState];

/**
 * State for transform box state machine.
 */
export const TransformBoxState = {
  None: "none",
  Idle: "idle",
  Editing: "editing",
} as const;

export type TransformBoxState =
  (typeof TransformBoxState)[keyof typeof TransformBoxState];

/**
 * Kind of transform handle (corner, edge, rotation).
 */
export const TransformHandleKind = {
  Scale: "scale",
  Stretch: "stretch",
  Rotate: "rotate",
} as const;

export type TransformHandleKind =
  (typeof TransformHandleKind)[keyof typeof TransformHandleKind];
