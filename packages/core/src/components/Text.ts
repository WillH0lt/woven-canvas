import { Type, component, field } from '@lastolivegames/becsy'

import type { ISerializable, TextModel } from '../types.js'

@component
export class Text implements ISerializable<TextModel> {
  @field.dynamicString(1e4) public declare content: string
  @field.dynamicString(36) public declare align: string
  @field({ type: Type.float32, default: 24 }) public declare fontSize: number
  @field.uint8 public declare red: number
  @field.uint8 public declare green: number
  @field.uint8 public declare blue: number

  toModel(): TextModel {
    return {
      content: this.content,
      align: this.align,
      fontSize: this.fontSize,
      red: this.red,
      green: this.green,
      blue: this.blue,
    }
  }

  fromModel(model: TextModel): void {
    this.content = model.content
    this.align = model.align
    this.fontSize = model.fontSize
    this.red = model.red
    this.green = model.green
    this.blue = model.blue
  }
}
