import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'
import { VerticalAlign } from '../types'

@component
export class Text extends BaseComponent {
  @field.dynamicString(1e4) public declare content: string
  @field({ type: Type.float32, default: 24 }) public declare fontSize: number
  @field.dynamicString(36) public declare fontFamily: string
  @field({ type: Type.float32, default: 1.2 }) public declare lineHeight: number
  @field({ type: Type.staticString(Object.values(VerticalAlign)), default: VerticalAlign.Top })
  public declare verticalAlign: VerticalAlign
}
