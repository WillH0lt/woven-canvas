import { Type, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '@infinitecanvas/core'
import { POINTS_CAPACITY } from '../constants'

@component
export class Stroke extends BaseComponent {
  @field.float32.vector(POINTS_CAPACITY) declare points: number[]
  @field.int32 declare pointCount: number

  @field({ type: Type.float32, default: 8 }) declare thickness: number
  @field.float32 declare originalLeft: number
  @field.float32 declare originalTop: number
  @field.float32 declare originalWidth: number
  @field.float32 declare originalHeight: number
  @field.boolean declare isComplete: boolean

  public toJson(): Record<string, any> {
    const size = this.pointCount * 2
    const points = new Array(size)

    for (let i = 0; i < size; i++) {
      points[i] = this.points[i]
    }

    return {
      points,
      pointCount: this.pointCount,
      thickness: this.thickness,
      originalWidth: this.originalWidth,
      originalHeight: this.originalHeight,
      originalLeft: this.originalLeft,
      originalTop: this.originalTop,
      isComplete: this.isComplete,
    }
  }

  public fromJson(data: Record<string, any>): this {
    this.points = new Array(POINTS_CAPACITY).fill(0)
    this.pointCount = data.pointCount
    this.thickness = data.thickness
    this.originalWidth = data.originalWidth
    this.originalHeight = data.originalHeight
    this.originalLeft = data.originalLeft
    this.originalTop = data.originalTop
    this.isComplete = data.isComplete

    for (let i = 0; i < this.pointCount * 2; i++) {
      this.points[i] = data.points[i]
    }

    return this
  }
}
