import { BaseComponent } from '@infinitecanvas/core'
import { type Entity, component, field } from '@lastolivegames/becsy'
import { ArrowDrawState as State } from '../types'

@component
export class ArrowDrawState extends BaseComponent {
  @field.staticString(Object.values(State)) public declare state: State
  @field.int32.vector(2) public declare pointingStartClient: [number, number]
  @field.int32.vector(2) public declare pointingStartWorld: [number, number]
  @field.ref public declare activeArrow: Entity | null
}
