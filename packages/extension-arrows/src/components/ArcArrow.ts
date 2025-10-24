import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'

import { ArrowHeadKind } from '../types'

@component
export class ArcArrow extends BaseComponent {
  @field.float64.vector(2) declare a: [number, number]
  @field.float64.vector(2) declare b: [number, number]
  @field.float64.vector(2) declare c: [number, number]

  @field({ type: Type.float32, default: 4 }) declare thickness: number
  @field.staticString(Object.values(ArrowHeadKind)) public declare startArrowHead: ArrowHeadKind
  @field.staticString(Object.values(ArrowHeadKind)) public declare endArrowHead: ArrowHeadKind

  public isCurved(): boolean {
    const { a, b, c } = this

    const det = (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1])

    return Math.abs(det) > 1e-8
  }
}
