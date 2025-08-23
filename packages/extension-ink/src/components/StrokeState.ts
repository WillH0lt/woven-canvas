import { type Entity, component, field } from '@lastolivegames/becsy'
import { StrokeState as State } from '../types'

@component
export class StrokeState {
  @field.staticString(Object.values(State)) public declare state: State
  @field.ref public declare activeStroke: Entity | null
}
