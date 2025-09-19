import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { style } from './rectangular-handle.style'

@customElement('ic-rectangular-handle')
export class ICRectangularHandle extends LitElement {
  static styles = style

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rectangular-handle': ICRectangularHandle
  }
}
