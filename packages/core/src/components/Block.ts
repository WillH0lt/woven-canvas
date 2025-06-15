import { Type, component, field } from '@lastolivegames/becsy'
import type { BlockModel, IStorable } from '../types'

@component
export class Block implements IStorable<BlockModel> {
  @field.dynamicString(36) public declare id: string
  @field.float32 declare top: number
  @field.float32 declare left: number
  @field.float32 declare width: number
  @field.float32 declare height: number
  @field.float32 declare rotateZ: number
  @field.uint8 declare red: number
  @field.uint8 declare green: number
  @field.uint8 declare blue: number
  @field({ type: Type.uint8, default: 255 }) declare alpha: number
  // @field.dynamicString(36) public declare tag: string
  // @field.dynamicString(32) public declare layer: string
  @field.dynamicString(36) public declare rank: string

  toModel(): BlockModel {
    return {
      id: this.id,
      top: this.top,
      left: this.left,
      width: this.width,
      height: this.height,
      red: this.red,
      green: this.green,
      blue: this.blue,
      alpha: this.alpha,
      rank: this.rank,
    }
  }

  fromModel(model: BlockModel): void {
    this.id = model.id
    this.top = model.top
    this.left = model.left
    this.width = model.width
    this.height = model.height
    this.red = model.red
    this.green = model.green
    this.blue = model.blue
    this.alpha = model.alpha
    this.rank = model.rank
  }
}
