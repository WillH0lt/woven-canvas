import { Type, component, field } from '@lastolivegames/becsy'
import { PointerButton, PointerType } from '../types'

@component
export class Pointer {
  @field.uint16 public declare id: number
  @field.int32.vector(2) public declare downPosition: [number, number]
  @field.int32.vector(2) public declare position: [number, number]
  @field({ type: Type.staticString(Object.values(PointerType)) })
  public declare pointerType: PointerType
  @field({ type: Type.staticString(Object.values(PointerButton)) })
  public declare button: PointerButton
}
