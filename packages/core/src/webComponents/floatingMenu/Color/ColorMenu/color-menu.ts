import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

import { InfiniteCanvas } from '../../../../InfiniteCanvas'
import { Color } from '../../../../components'
import { ICBaseMenuButton } from '../../../elements'

@customElement('ic-color-menu')
export class ICColorMenu extends SignalWatcher(ICBaseMenuButton) {
  private pickerVisible = signal(false)

  render() {
    const color = InfiniteCanvas.instance?.store.core.colorById(this.blockId)
    if (!color?.value) {
      return nothing
    }

    const hex = color.value.toHex()

    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${hex}
                @change=${(e: CustomEvent<string>) => {
                  const color = new Color().fromHex(e.detail)
                  InfiniteCanvas.instance?.commands.core.setColor(this.blockId, color)
                }}
              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                id="color-bubbles"
                withPicker="true"
                .currentColor=${hex}
                @change=${(e: CustomEvent<string>) => {
                  const color = new Color().fromHex(e.detail)
                  InfiniteCanvas.instance?.commands.core.setColor(this.blockId, color)
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
    'ic-color-menu': ICColorMenu
  }
}
