import { SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { LitElement, html, nothing, svg } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import type { IStore } from '../../../../types'
import { storeContext } from '../../../contexts'
import { style } from './color-button.style'

const chevronDownIcon = svg`
  <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
`

@customElement('ic-color-button')
export class ICColorButton extends SignalWatcher(LitElement) {
  static styles = style

  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  render() {
    const colors = this.store.core.selectedColors

    if (colors.value.length === 0) return nothing

    const hexes = colors.value.map((c) => c.toHex())

    const hasMultipleColors = colors.value.length > 1

    return html`
      <div
        class="button"
      >
        <div
          class="circle"
          style=${styleMap(
            hasMultipleColors
              ? {
                  background: `linear-gradient(45deg, ${hexes[0]} 0%, ${hexes[0]} 50%, ${hexes[1]} 50%, ${hexes[1]} 100%)`,
                }
              : {
                  'background-color': hexes[0],
                },
          )}
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
    'ic-color-button': ICColorButton
  }
}
