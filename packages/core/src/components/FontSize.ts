import { component, field } from '@lastolivegames/becsy'
import type { FontSizeModel, ISerializable } from '../types'

@component
export class FontSize implements ISerializable<FontSizeModel> {
  @field.float32 public declare value: number
  @field.float32 public declare lastBlockWidth: number
  @field.float32 public declare lastBlockHeight: number

  public toModel(): FontSizeModel {
    return {
      value: this.value,
      lastBlockWidth: this.lastBlockWidth,
      lastBlockHeight: this.lastBlockHeight,
    }
  }

  public fromModel(model: FontSizeModel): void {
    this.value = model.value
    this.lastBlockWidth = model.lastBlockWidth
    this.lastBlockHeight = model.lastBlockHeight
  }
}
