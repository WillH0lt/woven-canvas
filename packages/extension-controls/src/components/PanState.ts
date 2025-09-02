import { BaseComponent } from '@infinitecanvas/core'
import { component, field } from '@lastolivegames/becsy'

import { PanState as State } from '../types'

@component
export class PanState extends BaseComponent {
  @field.staticString(Object.values(State)) public declare state: State
  @field.float32.vector(2) public declare panStart: [number, number]
}
