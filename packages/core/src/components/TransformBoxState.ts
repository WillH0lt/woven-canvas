import { type Entity, component, field } from '@lastolivegames/becsy'
import { TransformBoxState as State } from '../types'

@component
export class TransformBoxState {
  @field.staticString(Object.values(State)) public declare state: State
  @field.int32.vector(2) public declare dragStart: [number, number]
  @field.int32.vector(2) public declare pointingStartClient: [number, number]
  @field.int32.vector(2) public declare pointingStartWorld: [number, number]
  @field.int32.vector(2) public declare draggedEntityStart: [number, number]
  @field.ref public declare draggedEntity: Entity | null
}
