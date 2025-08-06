import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { style } from './menu-container.style'

@customElement('ic-menu-container')
export class MenuContainerElement extends LitElement {
  static styles = style

  render() {
    return html`
      <div id="container">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-menu-container': MenuContainerElement
  }
}
