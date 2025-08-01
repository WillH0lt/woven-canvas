import { component, field } from '@lastolivegames/becsy'

@component
export class TextDragStart {
  @field.float32 public declare startHeight: number
  @field.float32 public declare startWidth: number
  @field.float32 public declare startFontSize: number

  @field.float32 public declare lastHeight: number
  @field.float32 public declare lastWidth: number
}
