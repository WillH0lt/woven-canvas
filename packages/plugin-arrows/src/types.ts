/**
 * State values for the arrow draw state machine.
 */
export const ArrowDrawStateEnum = {
  /** Idle - waiting for user to start drawing */
  Idle: "idle",
  /** Pointing - pointer down but not yet dragging */
  Pointing: "pointing",
  /** Dragging - actively drawing an arrow */
  Dragging: "dragging",
} as const;

export type ArrowDrawStateValue =
  (typeof ArrowDrawStateEnum)[keyof typeof ArrowDrawStateEnum];

/**
 * State values for the arrow transform state machine.
 */
export const ArrowTransformStateEnum = {
  /** None - no arrow selected */
  None: "none",
  /** Idle - arrow selected, showing transform handles */
  Idle: "idle",
  /** Editing - actively editing the arrow */
  Editing: "editing",
} as const;

export type ArrowTransformStateValue =
  (typeof ArrowTransformStateEnum)[keyof typeof ArrowTransformStateEnum];

/**
 * Kind of arrow handle (start, middle, or end).
 */
export const ArrowHandleKind = {
  Start: "start",
  Middle: "middle",
  End: "end",
} as const;

export type ArrowHandleKind =
  (typeof ArrowHandleKind)[keyof typeof ArrowHandleKind];

/**
 * Kind of arrow head (none or v-shaped).
 */
export const ArrowHeadKind = {
  None: "none",
  V: "v",
} as const;

export type ArrowHeadKind = (typeof ArrowHeadKind)[keyof typeof ArrowHeadKind];

/**
 * Kind of arrow (arc or elbow).
 */
export const ArrowKind = {
  Arc: "arc",
  Elbow: "elbow",
} as const;

export type ArrowKind = (typeof ArrowKind)[keyof typeof ArrowKind];
