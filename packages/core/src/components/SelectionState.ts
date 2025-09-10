import { type Entity, component, field } from '@lastolivegames/becsy'
import { SelectionState as State } from '../types'

@component
export class SelectionState {
  @field.staticString(Object.values(State)) public declare state: State
  @field.int32.vector(2) public declare dragStart: [number, number]
  @field.int32.vector(2) public declare pointingStartClient: [number, number]
  @field.int32.vector(2) public declare pointingStartWorld: [number, number]
  @field.int32.vector(2) public declare draggedEntityStart: [number, number]
  @field.ref public declare draggedEntity: Entity | undefined
  @field.dynamicString(24) public declare cloneGeneratorSeed: string
  // @field({ type: Type.dynamicString(1024), default: '[]' }) public declare clonedEntityIds: string
}
