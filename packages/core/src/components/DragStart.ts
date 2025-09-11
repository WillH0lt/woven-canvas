import { component, field } from '@lastolivegames/becsy'

@component
export class DragStart {
  @field.float64 public declare startLeft: number
  @field.float64 public declare startTop: number
  @field.float64 public declare startWidth: number
  @field.float64 public declare startHeight: number
  @field.float64 public declare startRotateZ: number
  @field.float64 public declare startFontSize: number
}
