import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { LitElement, html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

import { Color } from '../../../../components'
import type { ICommands, IConfig, IStore } from '../../../../types'
import { commandsContext, configContext, storeContext } from '../../../contexts'

@customElement('ic-color-menu')
export class ICColorMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

  private pickerVisible = signal(false)

  render() {
    const colors = this.store.core.selectedColors.value

    if (!colors || colors.length === 0) return nothing

    const hex = colors[0].toHex()

    const hasMultipleColors = colors.length > 1

    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${hex}
                @change=${(e: CustomEvent<string>) => {
                  const color = new Color().fromHex(e.detail)
                  this.commands.core.applyColorToSelected(color)
                }}

              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                id="color-bubbles"
                .currentColor=${hex}
                .hideHighlight=${hasMultipleColors}
                .palette=${this.config.core.colorMenu.palette}
                .withPicker=${this.config.core.colorMenu.showPicker}
                @change=${(e: CustomEvent<string>) => {
                  const color = new Color().fromHex(e.detail)
                  this.commands.core.applyColorToSelected(color)
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
