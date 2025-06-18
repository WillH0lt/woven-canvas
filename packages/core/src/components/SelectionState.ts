import { type Entity, component, field } from '@lastolivegames/becsy'
import { Selection } from '../types'

@component
export class SelectionState {
  @field.staticString(Object.values(Selection)) public declare state: Selection
  @field.int32.vector(2) public declare dragStart: [number, number]
  @field.int32.vector(2) public declare pointingStart: [number, number]
  @field.int32.vector(2) public declare draggedEntityStart: [number, number]
  @field.ref public declare draggedEntity: Entity | null
}
