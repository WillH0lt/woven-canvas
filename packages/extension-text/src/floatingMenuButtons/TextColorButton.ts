import { InfiniteCanvas } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { LitElement, html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-text-color-button')
export class TextColorButtonElement extends SignalWatcher(LitElement) {
  render() {
    const color = InfiniteCanvas.instance?.store.textEditor.color
    if (!color?.value) {
      return nothing
    }

    return html`
      <ic-color-button-content .color=${color.value}>
      </ic-color-button-content>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-color-button': TextColorButtonElement
  }
}
