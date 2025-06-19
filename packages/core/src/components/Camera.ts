import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Camera {
  @field.float32 public declare top: number
  @field.float32 public declare left: number
  @field({ type: Type.float32, default: 1 }) public declare zoom: number

  toWorld(vec: [number, number]): [number, number] {
    const worldX = this.left + vec[0] / this.zoom
    const worldY = this.top + vec[1] / this.zoom
    return [worldX, worldY]
  }
}
