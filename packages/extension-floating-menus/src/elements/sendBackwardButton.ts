import { InfiniteCanvas } from '@infinitecanvas/core'
import { LitElement, css, html, svg } from 'lit'
import { customElement } from 'lit/decorators.js'

const duplicateIcon = svg`
  <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path
    d="M32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32H352c17.7 0 32 14.3 32 32s-14.3 32-32 32H32zM214.6 342.6c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 242.7V64c0-17.7 14.3-32 32-32s32 14.3 32 32V242.7l73.4-73.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-128 128z"
  ></path>
`

@customElement('ic-send-backward-button')
export class SendBackwardButton extends LitElement {
  static styles = css`
    .container {
      display: flex;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  `

  render() {
    return html`
      <div class="container" @click="${() => InfiniteCanvas.instance?.commands.core.sendBackwardSelected()}">
        <svg
          viewBox="0 0 384 512"
          fill="currentColor"
          width="40%"
        >
          ${duplicateIcon}
        </svg>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-send-backward-button': SendBackwardButton
  }
}
