import { InfiniteCanvas } from '@infinitecanvas/core'
import { ICBaseMenuButton } from '@infinitecanvas/core/elements'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-color-button')
export class ICColorButton extends SignalWatcher(ICBaseMenuButton) {
  render() {
    const color = InfiniteCanvas.instance?.store.color.colorById(this.blockId)
    if (!color?.value) {
      return nothing
    }

    const hex = color.value.toHex()
    return html`
      <ic-color-button-content .color=${hex}>
      </ic-color-button-content>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-button': ICColorButton
  }
}
