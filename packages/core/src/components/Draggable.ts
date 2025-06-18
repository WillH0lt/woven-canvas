import { Type, component, field } from '@lastolivegames/becsy'
import { CursorIcon } from '../types'

@component
export class Draggable {
  @field.float32 public declare startLeft: number
  @field.float32 public declare startTop: number
  @field.float32 public declare startWidth: number
  @field.float32 public declare startHeight: number
  @field.float32 public declare startRotateZ: number
  @field({ type: Type.staticString(Object.values(CursorIcon)), default: CursorIcon.Pointer })
  public declare hoverCursor: CursorIcon
}
