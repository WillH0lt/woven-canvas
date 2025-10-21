import { BaseComponent } from '@infinitecanvas/core'
import { type Entity, component, field } from '@lastolivegames/becsy'
import { ArrowKind, ArrowDrawState as State } from '../types'

@component
export class ArrowDrawState extends BaseComponent {
  @field.staticString(Object.values(State)) public declare state: State
  @field.int32.vector(2) public declare pointingStartClient: [number, number]
  @field.int32.vector(2) public declare pointingStartWorld: [number, number]
  @field.ref public declare activeArrow: Entity | null
  @field.staticString(Object.values(ArrowKind)) public declare kind: ArrowKind

  public toContext(): {
    pointingStartClient: [number, number]
    pointingStartWorld: [number, number]
    activeArrow: Entity | null
  } {
    return {
      pointingStartClient: [this.pointingStartClient[0], this.pointingStartClient[1]],
      pointingStartWorld: [this.pointingStartWorld[0], this.pointingStartWorld[1]],
      activeArrow: this.activeArrow,
    }
  }
}
