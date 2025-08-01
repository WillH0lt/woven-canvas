import { SignalWatcher } from '@lit-labs/preact-signals'
import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'

import { InfiniteCanvas } from '../../InfiniteCanvas'
import { colorToHex } from '../../helpers'
import { BaseElement } from '../base'

@customElement('ic-color-button')
export class ColorButtonElement extends SignalWatcher(BaseElement) {
  render() {
    const color = InfiniteCanvas.instance?.store.core.colorById(this.blockId)
    if (!color?.value) {
      return nothing
    }

    return html`
      <ic-color-button-content .color=${colorToHex(color.value)}>
      </ic-color-button-content>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-button': ColorButtonElement
  }
}
