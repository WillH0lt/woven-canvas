import { Type, component, field } from '@lastolivegames/becsy'

import type { ISerializable, TextModel } from '../types.js'

@component
export class Text implements ISerializable<TextModel> {
  @field.dynamicString(1e4) public declare content: string
  @field({ type: Type.float32, default: 24 }) public declare fontSize: number
  @field.dynamicString(36) public declare fontFamily: string
  @field({ type: Type.float32, default: 1.2 }) public declare lineHeight: number

  toModel(): TextModel {
    return {
      content: this.content,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      lineHeight: this.lineHeight,
    }
  }

  fromModel(model: TextModel): void {
    this.content = model.content
    this.fontSize = model.fontSize
    this.fontFamily = model.fontFamily
    this.lineHeight = model.lineHeight
  }
}
