import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'

import { ArrowHeadKind } from '../types'

const ELBOW_ARROW_CAPACITY = 24

@component
export class ElbowArrow extends BaseComponent {
  // @field.float64.vector(2) declare a: [number, number]
  // @field.float64.vector(2) declare b: [number, number]
  // @field.float64.vector(2) declare c: [number, number]
  // @field.float64.vector(2) declare d: [number, number]

  @field.float64.vector(ELBOW_ARROW_CAPACITY * 2) declare points: number[]
  @field.uint8 declare pointCount: number

  @field({ type: Type.float32, default: 4 }) declare thickness: number
  @field.staticString(Object.values(ArrowHeadKind)) public declare startArrowHead: ArrowHeadKind
  @field.staticString(Object.values(ArrowHeadKind)) public declare endArrowHead: ArrowHeadKind

  public setPoint(index: number, point: [number, number]): void {
    this.points[index * 2] = point[0]
    this.points[index * 2 + 1] = point[1]
  }

  public getPoint(index: number): [number, number] {
    return [this.points[index * 2], this.points[index * 2 + 1]]
  }

  public toJson(): Record<string, any> {
    const size = this.pointCount * 2

    let points: number[] = []
    if (size > 0) {
      points = new Array<number>(size)

      for (let i = 0; i < size; i++) {
        points[i] = this.points[i]
      }
    }

    return {
      points,
      pointCount: this.pointCount,
      thickness: this.thickness,
      startArrowHead: this.startArrowHead,
      endArrowHead: this.endArrowHead,
    }
  }

  public fromJson(data: Record<string, any>): this {
    const schema = this.getSchema()
    for (const key in data) {
      if (key === 'points' || key === 'pointCount') continue
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        this[key] = data[key]
      }
    }

    this.points = new Array(ELBOW_ARROW_CAPACITY * 2).fill(0)

    if ('points' in data && Array.isArray(data.points)) {
      if (data.points.length / 2 > ELBOW_ARROW_CAPACITY) {
        throw new Error(`ElbowArrow points exceed capacity of ${ELBOW_ARROW_CAPACITY}`)
      }

      if (data.points.length % 2 !== 0) {
        throw new Error('ElbowArrow points array length must be even')
      }

      this.pointCount = data.points.length / 2
      for (let i = 0; i < this.pointCount * 2; i++) {
        this.points[i] = data.points[i]
      }
    }

    return this
  }
}
