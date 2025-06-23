import { type Entity, Type, component, field } from '@lastolivegames/becsy'
import { CursorIcon, CursorState as State } from '../types'

@component
export class CursorState {
  @field({ type: Type.staticString(Object.values(State)), default: State.Select })
  public declare state: State

  @field({ type: Type.staticString(Object.values(CursorIcon)), default: CursorIcon.Pointer })
  public declare icon: CursorIcon

  @field.float32 public declare iconRotation: number

  @field.ref public declare hoveredEntity: Entity | null

  // heldBlock is a stringified blockModel that the cursor is currently placing
  @field.dynamicString(512) public declare heldBlock: string

  toModel(): Record<string, any> {
    return {
      state: this.state,
      icon: this.icon,
      iconRotation: this.iconRotation,
      hoveredEntity: this.hoveredEntity ?? null,
      heldBlock: this.heldBlock,
    }
  }
}
