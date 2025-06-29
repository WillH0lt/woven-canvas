import { Type, component, field } from '@lastolivegames/becsy'
import { CursorIcon, type ISerializable } from '../types'

type HoverableModel = {
  cursor: CursorIcon
}

@component
export class Hoverable implements ISerializable {
  @field({ type: Type.staticString(Object.values(CursorIcon)), default: CursorIcon.Pointer })
  public declare cursor: CursorIcon

  public toModel(): HoverableModel {
    return {
      cursor: this.cursor,
    }
  }

  public fromModel(model: HoverableModel): void {
    this.cursor = model.cursor
  }
}
