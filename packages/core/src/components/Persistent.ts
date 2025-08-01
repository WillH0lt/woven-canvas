import { component, field } from '@lastolivegames/becsy'
import { Component } from '../Component'

@component
export class Persistent extends Component {
  static addToHistory = false

  @field.dynamicString(36) public declare id: string
}
