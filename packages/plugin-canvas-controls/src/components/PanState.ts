import { field, defineEditorState } from "@infinitecanvas/editor";

import { PanStateValue } from "../types";

/**
 * Pan state singleton - stores the state machine state and context for panning.
 *
 * Uses defineEditorState to simplify XState machine integration.
 */
export const PanState = defineEditorState({
  /** Current state of the pan state machine */
  state: field.string().max(16).default(PanStateValue.Idle),
  /** World X coordinate where pan started */
  panStartX: field.float64().default(0),
  /** World Y coordinate where pan started */
  panStartY: field.float64().default(0),
  /** X velocity for fling animation (world units/second) */
  velocityX: field.float64().default(0),
  /** Y velocity for fling animation (world units/second) */
  velocityY: field.float64().default(0),
  /** Target X position for fling animation */
  targetX: field.float64().default(0),
  /** Target Y position for fling animation */
  targetY: field.float64().default(0),
  /** Expected camera left position (to detect external changes) */
  expectedLeft: field.float64().default(0),
  /** Expected camera top position (to detect external changes) */
  expectedTop: field.float64().default(0),
});
