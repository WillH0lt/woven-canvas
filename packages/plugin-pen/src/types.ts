/**
 * State for the pen state machine.
 */
export const PenState = {
  /** Idle - waiting for user to start drawing */
  Idle: 'idle',
  /** Drawing - actively drawing a pen stroke */
  Drawing: 'drawing',
} as const

export type PenState = (typeof PenState)[keyof typeof PenState]

/**
 * Drawing mode for a pen stroke.
 *
 * - `Stroke` — the default. Renders a variable-width ink ribbon along the
 *   path the user drew.
 * - `Fill` — renders the enclosed area of the path as a filled shape. The
 *   path is closed by connecting its end back to its start with a straight
 *   line, and overlapping regions are resolved with the SVG even-odd fill
 *   rule (areas overlapped an even number of times are left empty). This
 *   matches the behaviour of Concepts' fill tool.
 *
 * Named `PenStrokeKind` (rather than `StrokeKind`) to avoid colliding with
 * the unrelated `StrokeKind` exported by `@woven-canvas/core`.
 */
export const PenStrokeKind = {
  /** Variable-width ink ribbon along the drawn path (default). */
  Stroke: 'stroke',
  /** Filled enclosed area, closed end-to-start, even-odd fill rule. */
  Fill: 'fill',
} as const

export type PenStrokeKind = (typeof PenStrokeKind)[keyof typeof PenStrokeKind]
