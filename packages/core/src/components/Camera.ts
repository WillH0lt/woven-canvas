import { Type, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '../BaseComponent'

@component
export class Camera extends BaseComponent {
  static persistent = true
  static singleton = true

  @field.float64 public declare top: number
  @field.float64 public declare left: number
  @field({ type: Type.float64, default: 1 }) public declare zoom: number
  @field.float64.vector(2) public declare velocity: [number, number]
  @field.float64.vector(2) public declare slideTarget: [number, number]

  toWorld(vec: [number, number]): [number, number] {
    const worldX = this.left + vec[0] / this.zoom
    const worldY = this.top + vec[1] / this.zoom
    return [worldX, worldY]
  }
}
