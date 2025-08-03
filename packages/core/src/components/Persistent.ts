import { component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Persistent extends BaseComponent {
  static addToHistory = false

  @field.dynamicString(36) public declare id: string
}
