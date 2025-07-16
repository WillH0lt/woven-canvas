import { Type, component, field } from '@lastolivegames/becsy'

import { type ISerializable, TextAlign, type TextModel } from '../types.js'

@component
export class Text implements ISerializable<TextModel> {
  @field.dynamicString(1e4) public declare content: string
  @field.dynamicString(36) public declare fontFamily: string
  @field({ type: Type.staticString(Object.values(TextAlign)) }) public declare align: TextAlign
  @field({ type: Type.float32, default: 1.2 }) public declare lineHeight: number
  @field.uint8 public declare red: number
  @field.uint8 public declare green: number
  @field.uint8 public declare blue: number
  @field({ type: Type.uint8, default: 255 }) declare alpha: number

  toModel(): TextModel {
    return {
      content: this.content,
      fontFamily: this.fontFamily,
      align: this.align,
      lineHeight: this.lineHeight,
      red: this.red,
      green: this.green,
      blue: this.blue,
      alpha: this.alpha,
    }
  }

  fromModel(model: TextModel): void {
    this.content = model.content
    this.fontFamily = model.fontFamily
    this.align = model.align
    this.lineHeight = model.lineHeight
    this.red = model.red
    this.green = model.green
    this.blue = model.blue
    this.alpha = model.alpha
  }
}
