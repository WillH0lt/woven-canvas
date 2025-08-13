import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { style } from './label.style'

@customElement('ic-label')
export class ICLabel extends LitElement {
  static styles = style

  render() {
    return html`
      <div id="label">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-label': ICLabel
  }
}
