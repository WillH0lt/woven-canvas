/**
 * State values for the tape draw state machine.
 */
export const TapeDrawStateEnum = {
  /** Idle - waiting for user to start drawing */
  Idle: 'idle',
  /** Pointing - pointer down, waiting for drag threshold */
  Pointing: 'pointing',
  /** Drawing - tape created, stretching with pointer */
  Drawing: 'drawing',
} as const

export type TapeDrawStateValue = (typeof TapeDrawStateEnum)[keyof typeof TapeDrawStateEnum]
