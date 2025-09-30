import { component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Selected extends BaseComponent {
  static persistent = false

  @field.dynamicString(36) public declare selectedBy: string
}
