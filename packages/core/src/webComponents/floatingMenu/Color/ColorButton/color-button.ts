import { InfiniteCanvas } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { LitElement, html, nothing, svg } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { style } from './color-button.style'

const chevronDownIcon = svg`
  <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
`

@customElement('ic-color-button')
export class ICColorButton extends SignalWatcher(LitElement) {
  static styles = style

  render() {
    const ids = InfiniteCanvas.instance?.store.core.selectedBlockIds

    const colors = new Set<string>()

    for (const id of ids?.value || []) {
      const color = InfiniteCanvas.instance?.store.core.colorById(id)
      if (color?.value) {
        colors.add(color.value.toHex())
      }
    }

    if (colors.size === 0) return nothing

    const colorArray = Array.from(colors)
    const hasMultipleColors = colors.size > 1

    return html`
      <div
        class="button"
      >
        <div
          class="circle"
          style=${styleMap(
            hasMultipleColors
              ? {
                  background: `linear-gradient(45deg, ${colorArray[0]} 0%, ${colorArray[0]} 50%, ${colorArray[1]} 50%, ${colorArray[1]} 100%)`,
                }
              : {
                  'background-color': colorArray[0],
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
