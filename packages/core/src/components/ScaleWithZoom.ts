import { Type, component, field } from '@lastolivegames/becsy'

@component
export class ScaleWithZoom {
  @field({ type: Type.vector(Type.float64, 2), default: [0.5, 0.5] }) public declare anchor: [number, number]

  @field.float64 declare startTop: number
  @field.float64 declare startLeft: number
  @field.float64 declare startWidth: number
  @field.float64 declare startHeight: number
}
