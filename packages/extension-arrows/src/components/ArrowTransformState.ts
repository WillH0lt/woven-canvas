import { BaseComponent } from '@infinitecanvas/core'
import { type Entity, component, field } from '@lastolivegames/becsy'
import { ArrowTransformState as State } from '../types'

@component
export class ArrowTransformState extends BaseComponent {
  @field.staticString(Object.values(State)) public declare state: State
  @field.ref public declare activeArrow: Entity | null
}
