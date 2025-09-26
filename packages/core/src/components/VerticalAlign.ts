import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'
import { VerticalAlign as VerticalAlignEnum } from '../types'

@component
export class VerticalAlign extends BaseComponent {
  @field({ type: Type.staticString(Object.values(VerticalAlignEnum)), default: VerticalAlignEnum.Top })
  public declare value: VerticalAlignEnum
}
