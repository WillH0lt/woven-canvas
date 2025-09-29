import { LitElement, html, svg } from 'lit'
import { property } from 'lit/decorators.js'
import { style } from './menu-dropdown-button.style'

const chevronDownIcon = svg`
<svg
  class="chevron-down"
  viewBox="0 0 512 512"
  fill="currentColor"
>
  <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
</svg>
`

export class ICMenuDropdownButton extends LitElement {
  static styles = style

  @property({ type: String })
  label = ''

  render() {
    return html`
      <div class="container">
        <div class="inner">
          <div class="label">${this.label}</div>
          <div class="chevron-icon">${chevronDownIcon}</div>
        </div>
      </div>
    `
  }
}
