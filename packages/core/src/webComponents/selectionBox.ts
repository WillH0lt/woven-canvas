import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-selection-box')
export class SelectionBoxElement extends LitElement {
  static styles = css`
    div {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      background-color: #5865f222;
      border-style: solid;
      border-width: calc(3px / var(--ic-zoom));
      border-color: var(--ic-primary);
    }
  `

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-selection-box': SelectionBoxElement
  }
}
