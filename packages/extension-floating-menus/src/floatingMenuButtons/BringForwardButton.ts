import { InfiniteCanvas } from '@infinitecanvas/core'
import { svg } from 'lit'
import { customElement } from 'lit/decorators.js'

import { AbstractButtonElement } from '../elements/AbstractButton'

const bringForwardIcon = svg`
  <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path
    d="M32 32C14.3 32 0 46.3 0 64S14.3 96 32 96H352c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM214.6 169.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 269.3V448c0 17.7 14.3 32 32 32s32-14.3 32-32V269.3l73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128z"
  ></path>
`

@customElement('ic-bring-forward-button')
export class BringForwardButton extends AbstractButtonElement {
  protected viewbox = '0 0 384 512'
  protected icon = bringForwardIcon

  protected onClick() {
    InfiniteCanvas.instance?.commands.core.bringForwardSelected()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-bring-forward-button': BringForwardButton
  }
}
