import { type Entity, Type, component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'
import { CursorIcon, CursorState as State } from '../types'

@component
export class CursorState extends BaseComponent {
  @field({ type: Type.staticString(Object.values(State)), default: State.Select })
  public declare state: State

  @field({ type: Type.staticString(Object.values(CursorIcon)), default: CursorIcon.Select })
  public declare icon: CursorIcon

  @field.float32 public declare iconRotation: number

  @field.ref public declare hoveredEntity: Entity | null

  // heldBlock is a stringified block that the cursor is currently placing
  @field.dynamicString(512) public declare heldBlock: string
}
