import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Color extends BaseComponent {
  @field.uint8 declare red: number
  @field.uint8 declare green: number
  @field.uint8 declare blue: number
  @field({ type: Type.uint8, default: 255 }) declare alpha: number
}
