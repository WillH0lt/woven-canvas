import { component } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Persistent extends BaseComponent {
  static addToHistory = false
}
