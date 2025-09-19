import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { style } from './transform-box.style'

@customElement('ic-transform-box')
export class ICTransformBox extends LitElement {
  static styles = style

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-transform-box': ICTransformBox
  }
}
