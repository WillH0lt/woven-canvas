import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { InfiniteCanvas } from '../../../../InfiniteCanvas'
import { Color } from '../../../../components'

@customElement('ic-color-menu')
export class ICColorMenu extends SignalWatcher(LitElement) {
  private pickerVisible = signal(false)

  render() {
    const ids = InfiniteCanvas.instance?.store.core.selectedBlockIds

    const colors = new Set<string>()

    for (const id of ids?.value || []) {
      const color = InfiniteCanvas.instance?.store.core.colorById(id)
      if (color?.value) {
        colors.add(color.value.toHex())
      }
    }

    const colorArray = Array.from(colors)
    const hex = colorArray[0]

    const hasMultipleColors = colors.size > 1

    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${hex}
                @change=${(e: CustomEvent<string>) => {
                  const color = new Color().fromHex(e.detail)
                  InfiniteCanvas.instance?.commands.core.applyColorToSelected(color)
                }}

              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                id="color-bubbles"
                withPicker="true"
                .currentColor=${hex}
                .hideHighlight=${hasMultipleColors}
                @change=${(e: CustomEvent<string>) => {
                  const color = new Color().fromHex(e.detail)
                  InfiniteCanvas.instance?.commands.core.applyColorToSelected(color)
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
