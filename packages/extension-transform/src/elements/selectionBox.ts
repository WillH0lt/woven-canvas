import { BaseElement } from '@infinitecanvas/core/elements'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-selection-box')
export class SelectionBoxElement extends BaseElement {
  static styles = css`
    div {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      background-color: #5865f222;
      border-style: solid;
      border-width: 2px;
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
