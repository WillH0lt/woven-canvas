import { InfiniteCanvas } from '@infinitecanvas/core'
import { AbstractButtonElement } from '@infinitecanvas/extension-floating-menus'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { svg } from 'lit'
import { customElement } from 'lit/decorators.js'

const underlineIcon = svg`
  <!--!Font Awesome Free 6.7.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path
    d="M16 64c0-17.7 14.3-32 32-32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-16 0 0 128c0 53 43 96 96 96s96-43 96-96l0-128-16 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-16 0 0 128c0 88.4-71.6 160-160 160s-160-71.6-160-160L64 96 48 96C30.3 96 16 81.7 16 64zM0 448c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32z"
  />
`
@customElement('ic-underline-button')
export class UnderlineButtonElement extends SignalWatcher(AbstractButtonElement) {
  protected viewbox = '0 0 384 512'
  protected icon = underlineIcon

  protected onClick(): void {
    InfiniteCanvas.instance?.commands.textEditor.toggleUnderline()
  }

  public firstUpdated(): void {
    const isActive = InfiniteCanvas.instance?.store.textEditor.underline as ReadonlySignal<boolean>

    isActive.subscribe(this.setButtonActive.bind(this))

    this.setButtonActive(isActive.value)
  }

  private setButtonActive(active: boolean): void {
    const button = this.shadowRoot?.querySelector('.button') as HTMLElement | null

    if (active) {
      button?.classList.add('active')
    } else {
      button?.classList.remove('active')
    }

    this.requestUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-underline-button': UnderlineButtonElement
  }
}
