import { ICBaseMenuButton } from '@infinitecanvas/core/elements'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-transform-box')
export class TransformBoxElement extends ICBaseMenuButton {
  static styles = css`
    div {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      outline-style: solid;
      outline-width: calc(4px / var(--ic-zoom));
      outline-color: var(--ic-primary);
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
