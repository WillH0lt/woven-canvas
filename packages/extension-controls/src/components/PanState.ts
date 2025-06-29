import { component, field } from '@lastolivegames/becsy'

import { PanState as State } from '../types'

@component
export class PanState {
  @field.staticString(Object.values(State)) public declare state: State
  @field.int32.vector(2) public declare panStart: [number, number]
  @field.int32.vector(2) public declare cameraStart: [number, number]
}
