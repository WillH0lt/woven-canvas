import { defineEditorState, field } from '@woven-canvas/core'

/**
 * State values for the placement draw state machine.
 */
export const PlacementDrawStateEnum = {
  Idle: 'idle',
  Pointing: 'pointing',
  Drawing: 'drawing',
} as const

export type PlacementDrawStateValue = (typeof PlacementDrawStateEnum)[keyof typeof PlacementDrawStateEnum]

/**
 * PlacementDrawState singleton - tracks the draw-to-create interaction state.
 *
 * Used by drawPlacementSystem to handle click-and-drag creation of shapes, frames, etc.
 */
export const PlacementDrawState = defineEditorState('placementDrawState', {
  state: field.string().max(16).default(PlacementDrawStateEnum.Idle),
  activeEntity: field.ref(),
  pointingStartWorld: field.tuple(field.float64(), 2).default([0, 0]),
})
