import { Type, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '@infinitecanvas/core'
import { ShapeFillKind, ShapeKind, ShapeStrokeKind } from '../types'

@component
export class Shape extends BaseComponent {
  @field({ type: Type.staticString(Object.values(ShapeKind)), default: ShapeKind.Rectangle })
  public declare kind: ShapeKind

  @field({ type: Type.staticString(Object.values(ShapeStrokeKind)), default: ShapeStrokeKind.Solid })
  public declare strokeKind: ShapeStrokeKind

  @field.uint16 declare char: number

  // @field({ type: Type.uint32, default: 0xFF0000FF }) declare color: number // default red with full alpha

  // @field.uint8 declare strokeRed: number
  // @field.uint8 declare strokeGreen: number
  // @field.uint8 declare strokeBlue: number
  // @field({ type: Type.uint8, default: 255 }) declare strokeAlpha: number

  @field({ type: Type.staticString(Object.values(ShapeFillKind)), default: ShapeFillKind.Solid })
  public declare fillKind: ShapeFillKind

  // @field.uint8 declare fillRed: number
  // @field.uint8 declare fillGreen: number
  // @field.uint8 declare fillBlue: number
  // @field({ type: Type.uint8, default: 255 }) declare fillAlpha: number
}
