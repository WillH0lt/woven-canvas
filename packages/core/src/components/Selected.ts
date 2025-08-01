import { component, field } from '@lastolivegames/becsy'
import { Component } from '../Component'

@component
export class Selected extends Component {
  static addToHistory = false

  @field.dynamicString(36) public declare selectedBy: string
}
