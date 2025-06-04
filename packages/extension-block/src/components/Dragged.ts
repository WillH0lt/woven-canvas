import { component, field } from '@lastolivegames/becsy'
import { DragState } from '../types'

// @component
// export class Dragged {
//   @field.int32.vector(2) public declare grabOffset: [number, number]
//   @field.int32.vector(2) public declare pointerStart: [number, number]
//   @field.boolean public declare thresholdReached: boolean
// }

@component
export class Dragged {
  @field.int32.vector(2) public declare blockStart: [number, number]
  @field.int32.vector(2) public declare grabOffset: [number, number]
  @field.int32.vector(2) public declare pointerStart: [number, number]
  @field.int32.vector(2) public declare delta: [number, number]
  @field.staticString(Object.values(DragState)) public declare state: DragState
}
