/**
 * State for the pen state machine.
 */
export const PenState = {
  /** Idle - waiting for user to start drawing */
  Idle: "idle",
  /** Drawing - actively drawing a pen stroke */
  Drawing: "drawing",
} as const;

export type PenState = (typeof PenState)[keyof typeof PenState];
