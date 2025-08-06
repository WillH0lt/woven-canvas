import { InfiniteCanvas } from '@infinitecanvas/core'
import { BaseElement } from '@infinitecanvas/core/elements'
import { colorToHex } from '@infinitecanvas/core/helpers'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-color-button')
export class ColorButtonElement extends SignalWatcher(BaseElement) {
  render() {
    const color = InfiniteCanvas.instance?.store.color.colorById(this.blockId)
    if (!color?.value) {
      return nothing
    }

    const hex = colorToHex(color.value)

    return html`
      <ic-color-button-content .color=${hex}>
      </ic-color-button-content>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-button': ColorButtonElement
  }
}
