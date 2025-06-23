import { component, field } from '@lastolivegames/becsy'

import { DragState as State } from '../types'

@component
export class DragState {
  @field.staticString(Object.values(State)) public declare state: State
  @field.int32.vector(2) public declare dragStart: [number, number]
  @field.int32.vector(2) public declare cameraStart: [number, number]
}
