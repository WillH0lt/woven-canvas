import { Type, component, field } from '@lastolivegames/becsy'
import { CursorIcon } from '../types'

@component
export class Hoverable {
  @field({ type: Type.staticString(Object.values(CursorIcon)), default: CursorIcon.Pointer })
  public declare cursor: CursorIcon
}
