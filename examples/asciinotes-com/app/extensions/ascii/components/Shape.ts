import { component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '@infinitecanvas/core'

@component
export class Shape extends BaseComponent {
  @field.dynamicString(32) public declare style: string
}
