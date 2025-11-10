import { Type, component, field } from '@lastolivegames/becsy'

import { VerticalAlign as VerticalAlignEnum } from '../types'
import { BaseComponent } from '../BaseComponent'

@component
export class VerticalAlign extends BaseComponent {
  @field({ type: Type.staticString(Object.values(VerticalAlignEnum)), default: VerticalAlignEnum.Top })
  public declare value: VerticalAlignEnum
}
