import { InfiniteCanvas } from '@infinitecanvas/core'
import { SignalWatcher, signal } from '@lit-labs/preact-signals'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
@customElement('ic-text-color-menu')
export class TextColorMenuElement extends SignalWatcher(LitElement) {
  private pickerVisible = signal(false)

  render() {
    return html`
        ${
          this.pickerVisible.value
            ? html`
              <ic-color-picker
                value=${InfiniteCanvas.instance?.store.text.color.value}
                @change=${(e: CustomEvent<string>) => {
                  InfiniteCanvas.instance?.commands.text.setColor(e.detail)
                }}
              ></ic-color-picker>
            `
            : html`
              <ic-color-bubbles
                withPicker="true"
                currentColor=${InfiniteCanvas.instance?.store.text.color.value}
                @change=${(e: CustomEvent<string>) => {
                  InfiniteCanvas.instance?.commands.text.setColor(e.detail)
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
    'ic-text-color-menu': TextColorMenuElement
  }
}
