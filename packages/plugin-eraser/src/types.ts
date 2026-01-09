/**
 * State for the eraser state machine.
 */
export const EraserState = {
  /** Idle - waiting for user to start erasing */
  Idle: "idle",
  /** Erasing - actively drawing an eraser stroke */
  Erasing: "erasing",
} as const;

export type EraserState = (typeof EraserState)[keyof typeof EraserState];
