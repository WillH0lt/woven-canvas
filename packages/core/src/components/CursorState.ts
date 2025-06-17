import { type Entity, Type, component, field } from '@lastolivegames/becsy'
import { CursorIcon, CursorState as State, Tool } from '../types'

@component
export class CursorState {
  @field({ type: Type.staticString(Object.values(State)), default: State.Select })
  public declare state: State

  @field({ type: Type.staticString(Object.values(Tool)), default: Tool.Select })
  public declare tool: Tool

  @field({ type: Type.staticString(Object.values(CursorIcon)), default: CursorIcon.Pointer })
  public declare icon: CursorIcon

  @field.ref public declare hoveredEntity: Entity | null

  // heldBlock is a stringified blockModel that the cursor is currently placing
  @field.dynamicString(512) public declare heldBlock: string
}
