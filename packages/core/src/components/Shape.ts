import { Type, component, field } from '@lastolivegames/becsy'

import type { ISerializable, ShapeModel } from '../types.js'

@component
export class Shape implements ISerializable<ShapeModel> {
  @field.uint8 declare red: number
  @field.uint8 declare green: number
  @field.uint8 declare blue: number
  @field({ type: Type.uint8, default: 255 }) declare alpha: number

  toModel(): ShapeModel {
    return {
      red: this.red,
      green: this.green,
      blue: this.blue,
      alpha: this.alpha,
    }
  }

  fromModel(model: ShapeModel): void {
    this.red = model.red
    this.green = model.green
    this.blue = model.blue
    this.alpha = model.alpha
  }
}
