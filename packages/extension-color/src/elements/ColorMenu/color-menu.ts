import { InfiniteCanvas } from '@infinitecanvas/core'
import { BaseElement } from '@infinitecanvas/core/elements'
import { colorToHex, hexToColor } from '@infinitecanvas/core/helpers'
import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

import { Color } from '../../components'

@customElement('ic-color-menu')
export class ColorMenuElement extends SignalWatcher(BaseElement) {
  private pickerVisible = signal(false)

  render() {
    const color = InfiniteCanvas.instance?.store.color.colorById(this.blockId)
    if (!color?.value) {
      return nothing
    }

    const hex = colorToHex(color.value)

    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${hex}
                @change=${(e: CustomEvent<string>) => {
                  const c = hexToColor(e.detail)
                  const color = new Color().deserialize(c)
                  InfiniteCanvas.instance?.commands.color.setColor(this.blockId, color)
                }}
              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                id="color-bubbles"
                withPicker="true"
                .currentColor=${hex}
                @change=${(e: CustomEvent<string>) => {
                  const c = hexToColor(e.detail)
                  const color = new Color().deserialize(c)
                  InfiniteCanvas.instance?.commands.color.setColor(this.blockId, color)
                }}
                @show-picker=${() => {
                  this.pickerVisible.value = true
                }}
              ></ic-color-bubbles>
            `
        }
      `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-menu': ColorMenuElement
  }
}
