import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { style } from './circular-handle.style.js'

@customElement('ic-circular-handle')
export class ICCircularHandle extends LitElement {
  static styles = style

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-circular-handle': ICCircularHandle
  }
}
