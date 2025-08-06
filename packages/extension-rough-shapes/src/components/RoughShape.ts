import { Type, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '@infinitecanvas/core'
import { ShapeFillKind, ShapeKind, ShapeStrokeKind } from '../types'

console.log(Object.keys(ShapeKind))

@component
export class RoughShape extends BaseComponent {
  @field({ type: Type.staticString(Object.values(ShapeKind)), default: ShapeKind.Rectangle })
  public declare kind: ShapeKind

  @field({ type: Type.staticString(Object.values(ShapeStrokeKind)), default: ShapeStrokeKind.Solid })
  public declare strokeKind: ShapeStrokeKind

  @field({ type: Type.float64, default: 4 }) public declare strokeWidth: number
  @field.uint8 declare strokeRed: number
  @field.uint8 declare strokeGreen: number
  @field.uint8 declare strokeBlue: number
  @field({ type: Type.uint8, default: 255 }) declare strokeAlpha: number
  @field({ type: Type.float64, default: 2 }) public declare roughness: number

  @field({ type: Type.staticString(Object.values(ShapeFillKind)), default: ShapeFillKind.Solid })
  public declare fillKind: ShapeFillKind

  @field({ type: Type.float64, default: 2 }) public declare fillWidth: number
  @field({ type: Type.float64, default: 10 }) public declare hachureGap: number
  @field({ type: Type.float64, default: 135 }) public declare hachureAngle: number
  @field.uint8 declare fillRed: number
  @field.uint8 declare fillGreen: number
  @field.uint8 declare fillBlue: number
  @field({ type: Type.uint8, default: 255 }) declare fillAlpha: number

  @field.uint32 public declare seed: number
}
