import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { style } from './selection-box.style.js'

@customElement('ic-selection-box')
export class ICSelectionBox extends LitElement {
  static styles = style

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-selection-box': ICSelectionBox
  }
}
