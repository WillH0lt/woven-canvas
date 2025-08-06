import { BaseElement } from '@infinitecanvas/core/elements'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-transform-box')
export class TransformBoxElement extends BaseElement {
  static styles = css`
    div {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      outline-style: solid;
      outline-width: 4px;
      outline-color: var(--ic-primary);
      border-radius: 6px;
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
    'ic-transform-box': TransformBoxElement
  }
}
