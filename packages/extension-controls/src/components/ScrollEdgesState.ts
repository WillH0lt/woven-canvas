import { BaseComponent } from '@infinitecanvas/core'
import { component, field } from '@lastolivegames/becsy'

import { ScrollEdgesState as State } from '../types'

@component
export class ScrollEdgesState extends BaseComponent {
  @field.staticString(Object.values(State)) public declare state: State
  @field.uint32 public declare edgeEnterStartTime: number
}
