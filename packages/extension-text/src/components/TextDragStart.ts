import { component, field } from '@lastolivegames/becsy'

@component
export class TextDragStart {
  @field.float64 public declare startHeight: number
  @field.float64 public declare startWidth: number
  @field.float64 public declare startFontSize: number

  @field.float64 public declare lastHeight: number
  @field.float64 public declare lastWidth: number
}
