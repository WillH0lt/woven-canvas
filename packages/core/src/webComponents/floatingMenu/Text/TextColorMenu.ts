import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import type { ICommands, IConfig, IStore } from '../../../types'
import { commandsContext, configContext, storeContext } from '../../contexts'

@customElement('ic-text-color-menu')
export class ICTextColorMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

  private pickerVisible = signal(false)

  render() {
    const hex = this.store.textEditor.color.value

    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${hex}
                @change=${(e: CustomEvent<string>) => {
                  this.commands.textEditor.setColor(e.detail)
                }}

              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                id="color-bubbles"
                .currentColor=${hex}
                .palette=${this.config.core.colorMenu.palette}
                .withPicker=${this.config.core.colorMenu.showPicker}
                @change=${(e: CustomEvent<string>) => {
                  this.commands.textEditor.setColor(e.detail)
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

// import { InfiniteCanvas } from '@infinitecanvas/core'
// import { SignalWatcher, signal } from '@lit-labs/preact-signals'
// import { LitElement, html } from 'lit'
// import { customElement } from 'lit/decorators.js'

// @customElement('ic-text-color-menu')
// export class ICTextColorMenu extends SignalWatcher(LitElement) {
//   private pickerVisible = signal(false)

//   render() {
//     return html`
//         ${
//           this.pickerVisible.value
//             ? html`
//               <ic-color-picker
//                 value=${InfiniteCanvas.instance?.store.textEditor.color.value}
//                 @change=${(e: CustomEvent<string>) => {
//                   InfiniteCanvas.instance?.commands.textEditor.setColor(e.detail)
//                 }}
//               ></ic-color-picker>
//             `
//             : html`
//               <ic-color-bubbles
//                 withPicker="true"
//                 currentColor=${InfiniteCanvas.instance?.store.textEditor.color.value}
//                 @change=${(e: CustomEvent<string>) => {
//                   InfiniteCanvas.instance?.commands.textEditor.setColor(e.detail)
//                 }}
//                 @show-picker=${() => {
//                   this.pickerVisible.value = true
//                 }}
//               ></ic-color-bubbles>
//             `
//         }`
//   }
// }

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-color-menu': ICTextColorMenu
  }
}
