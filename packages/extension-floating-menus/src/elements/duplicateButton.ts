import { InfiniteCanvas } from '@infinitecanvas/core'
import { LitElement, html, svg } from 'lit'
import { customElement } from 'lit/decorators.js'

import { buttonStyles } from '../styles'

const duplicateIcon = svg`
  <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path
    d="M288 448L64 448l0-224 64 0 0-64-64 0c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l224 0c35.3 0 64-28.7 64-64l0-64-64 0 0 64zm-64-96l224 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L224 0c-35.3 0-64 28.7-64 64l0 224c0 35.3 28.7 64 64 64z"
  />
`

@customElement('ic-duplicate-button')
export class DuplicateButtonElement extends LitElement {
  static styles = buttonStyles

  render() {
    return html`
      <div class="button" @click="${() => InfiniteCanvas.instance?.commands.core.duplicateSelected()}">
        <svg
          viewBox="0 0 512 512"
          fill="currentColor"
        >
          ${duplicateIcon}
        </svg>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-duplicate-button': DuplicateButtonElement
  }
}
