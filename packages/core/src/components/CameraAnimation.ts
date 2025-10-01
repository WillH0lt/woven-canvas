import { Type, component, field } from '@lastolivegames/becsy'

import { CameraAnimationKind } from '../types'

@component
export class CameraAnimation {
  @field.boolean public declare active: boolean
  @field({ type: Type.staticString(Object.values(CameraAnimationKind)), default: CameraAnimationKind.Bezier })
  public declare kind: CameraAnimationKind

  // used for bezier animation
  @field.float32.vector(4) public declare bezier: [number, number, number, number]
  @field.float32 public declare durationMs: number
  @field.float64 public declare elapsedMs: number

  @field.float64 public declare startTop: number
  @field.float64 public declare startLeft: number
  @field.float64 public declare startZoom: number

  @field.float64 public declare endTop: number
  @field.float64 public declare endLeft: number
  @field.float64 public declare endZoom: number

  // used for smooth damp animation
  @field.float64.vector(2) public declare velocity: [number, number]
  @field.float64.vector(2) public declare slideTarget: [number, number]
}
