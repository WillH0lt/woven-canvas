import { ICMenuIconButton } from '@infinitecanvas/core/elements'
import { customElement } from 'lit/decorators.js'

import { fillHachure } from './icons'

@customElement('ic-rough-shape-fill-button')
export class ICFillButton extends ICMenuIconButton {
  protected icon = fillHachure
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape-fill-button': ICFillButton
  }
}
