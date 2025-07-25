import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { style } from './divider.style.js'

@customElement('ic-divider')
export class DividerElement extends LitElement {
  static styles = style

  render() {
    return html`
      <div class="divider"></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-divider': DividerElement
  }
}
