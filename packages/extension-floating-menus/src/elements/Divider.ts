import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-divider')
export class DividerElement extends LitElement {
  static styles = css`
    .divider {
      height: 100%;
      width: 0.75px;
      margin: 0 4px;
      background-color: var(--ic-floating-menus-gray-600);
    }
  `

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
