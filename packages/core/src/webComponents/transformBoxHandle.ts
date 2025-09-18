import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-transform-box-handle')
export class TransformBoxHandleElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: block;
    }

    div {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
    }

    /*
      Sub‑pixel shrinking border: draw at zoom scale then inverse-scale.
      Pre-scale: size * var(--ic-zoom) with a 2px border & 2px radius.
      After transform scale(1/zoom): apparent border width & radius become 2px / zoom.
    */
    div::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: calc(100% * var(--ic-zoom));
      height: calc(100% * var(--ic-zoom));
      box-sizing: border-box;
      border: 2px solid var(--ic-primary);
      border-radius: 2px;
      background-color: var(--ic-gray-100);
      transform: translate(-50%, -50%) scale(calc(1 / var(--ic-zoom)));
      transform-origin: center center;
      pointer-events: none;
      transition-property: background-color;
      transition-timing-function: var(--ic-transition-timing-function);
      transition-duration: var(--ic-transition-duration);
    }

    :host([is-hovered]) > div::before {
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
