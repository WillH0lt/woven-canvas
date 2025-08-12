import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Color extends BaseComponent {
  @field.uint8 declare red: number
  @field.uint8 declare green: number
  @field.uint8 declare blue: number
  @field({ type: Type.uint8, default: 255 }) declare alpha: number

  public toHex(): string {
    const rHex = this.red.toString(16).padStart(2, '0')
    const gHex = this.green.toString(16).padStart(2, '0')
    const bHex = this.blue.toString(16).padStart(2, '0')
    const aHex = this.alpha.toString(16).padStart(2, '0')
    return `#${rHex}${gHex}${bHex}${aHex}`
  }

  public fromHex(hex: string): this {
    this.red = Number.parseInt(hex.slice(1, 3), 16)
    this.green = Number.parseInt(hex.slice(3, 5), 16)
    this.blue = Number.parseInt(hex.slice(5, 7), 16)
    this.alpha = hex.length > 7 ? Number.parseInt(hex.slice(7, 9), 16) : 255

    return this
  }
}
