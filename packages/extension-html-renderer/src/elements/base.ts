import { LitElement } from 'lit'
import { property } from 'lit/decorators.js'

// @customElement('ic-block')
export class BaseElement extends LitElement {
  @property({ type: String }) blockId!: string
}

// declare global {
//   interface HTMLElementTagNameMap {
//     'ic-base': BaseElement
//   }
// }
