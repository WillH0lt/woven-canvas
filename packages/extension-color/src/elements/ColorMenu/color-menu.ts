import { InfiniteCanvas } from '@infinitecanvas/core'
import { BaseElement } from '@infinitecanvas/core/elements'
import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

import { colorToHex, hexToColor } from '../helpers/math'

@customElement('ic-color-menu')
export class ColorMenuElement extends SignalWatcher(BaseElement) {
  private pickerVisible = signal(false)

  render() {
    const color = InfiniteCanvas.instance?.store.color.colorById(this.blockId)
    if (!color?.value) {
      return nothing
    }

    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${colorToHex(color.value)}
                @change=${(e: CustomEvent<string>) => {
                  const color = hexToColor(e.detail)
                  InfiniteCanvas.instance?.commands.color.setColor(this.blockId, color)
                }}
              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                withPicker="true"
                .currentColor=${colorToHex(color.value)}
                @change=${(e: CustomEvent<string>) => {
                  const color = hexToColor(e.detail)
                  InfiniteCanvas.instance?.commands.color.setColor(this.blockId, color)
                }}
                @show-picker=${() => {
                  this.pickerVisible.value = true
                }}
              ></ic-color-bubbles>
            `
        }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-menu': ColorMenuElement
  }
}
