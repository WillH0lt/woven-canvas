import { ICBaseMenuButton } from '@infinitecanvas/core/elements'
import { html, svg } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import { style } from './color-button-content.style'

const chevronDownIcon = svg`
  <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
`
@customElement('ic-color-button-content')
export class ICColorButtonContent extends ICBaseMenuButton {
  static styles = style

  @property({ type: String })
  public color = '#000000'

  render() {
    return html`
      <div
        class="button"
      >
        <div
          class="circle"
          style=${styleMap({
            'background-color': this.color,
          })}
        ></div>
        <svg
          class="chevron-down"
          viewBox="0 0 512 512"
          fill="currentColor"
        >
          ${chevronDownIcon}
        </svg>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-button-content': ICColorButtonContent
  }
}
