import { type Entity, component, field } from '@lastolivegames/becsy'
import { EraserState as State } from '../types'

@component
export class EraserState {
  @field.staticString(Object.values(State)) public declare state: State
  @field.ref public declare activeStroke: Entity | null
}
