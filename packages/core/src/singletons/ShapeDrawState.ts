import { field } from '@woven-ecs/core'
import { defineEditorState } from '../EditorStateDef'

/**
 * State values for the shape draw state machine.
 */
export const ShapeDrawStateEnum = {
  /** Idle - waiting for user to start drawing */
  Idle: 'idle',
  /** Pointing - pointer down, waiting for drag threshold */
  Pointing: 'pointing',
  /** Drawing - shape created, stretching with pointer */
  Drawing: 'drawing',
} as const

export type ShapeDrawStateValue = (typeof ShapeDrawStateEnum)[keyof typeof ShapeDrawStateEnum]

/**
 * Shape draw state singleton - stores the current state of the shape draw state machine.
 *
 * Tracks the drawing tool state and active shape entity while drawing.
 */
export const ShapeDrawState = defineEditorState('shapeDrawState', {
  /** Current state machine state */
  state: field.string().max(16).default(ShapeDrawStateEnum.Idle),

  /** Reference to the active shape entity (while drawing) */
  activeShape: field.ref(),

  /** Pointing start position in client coordinates [x, y] */
  pointingStartClient: field.tuple(field.int32(), 2).default([0, 0]),

  /** Pointing start position in world coordinates [x, y] */
  pointingStartWorld: field.tuple(field.float64(), 2).default([0, 0]),
})
