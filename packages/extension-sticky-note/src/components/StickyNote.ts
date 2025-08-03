import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'

import { VerticalAlign } from '../types'

@component
export class StickyNote extends BaseComponent {
  @field({ type: Type.staticString(Object.values(VerticalAlign)), default: VerticalAlign.Top })
  public declare verticalAlign: VerticalAlign
}
