import { AbstractButtonElement } from '@infinitecanvas/core/elements'
import { customElement } from 'lit/decorators.js'

import { fillHachure } from './icons'

@customElement('ic-rough-shape-fill-button')
export class FillButtonElement extends AbstractButtonElement {
  protected icon = fillHachure
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape-fill-button': FillButtonElement
  }
}
