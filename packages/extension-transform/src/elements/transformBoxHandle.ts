import { BaseElement } from '@infinitecanvas/core/elements'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-transform-box-handle')
export class TransformBoxHandleElement extends BaseElement {
  static styles = css`
    div {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-style: solid;
      border-width: 2px;
      border-color: var(--ic-primary);
      border-radius: 2px;
      transition-property: background-color;
      transition-timing-function: var(--ic-transition-timing-function);
      transition-duration: var(--ic-transition-duration);
      background-color: var(--ic-gray-100);
      pointer-events: auto;
    }

    div:hover {
      background-color: var(--ic-primary);
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
    'ic-transform-box-handle': TransformBoxHandleElement
  }
}
