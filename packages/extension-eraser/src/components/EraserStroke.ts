import { type Entity, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '@infinitecanvas/core'
import { POINTS_CAPACITY } from '../constants'
import { Erased } from './Erased'

@component
export class EraserStroke extends BaseComponent {
  @field.float32.vector(POINTS_CAPACITY) declare points: number[]
  @field.int32 declare pointCount: number
  @field.int32 declare firstPointIndex: number
  @field.backrefs(Erased, 'eraserStroke', true) public declare erasedBlocks: Entity[]

  public toJson(): Record<string, any> {
    const size = this.pointCount * 2
    const points = new Array(size)

    for (let i = 0; i < size; i++) {
      points[i] = this.points[i]
    }

    return {
      points,
      pointCount: this.pointCount,
      firstPointIndex: this.firstPointIndex,
    }
  }

  public fromJson(data: Record<string, any>): this {
    this.pointCount = data.pointCount
    this.firstPointIndex = data.firstPointIndex

    this.points = new Array(POINTS_CAPACITY).fill(0)
    for (let i = 0; i < this.pointCount * 2; i++) {
      this.points[i] = data.points[i]
    }

    return this
  }
}
