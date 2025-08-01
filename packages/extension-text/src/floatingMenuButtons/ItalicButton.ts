import { InfiniteCanvas } from '@infinitecanvas/core'
import { AbstractButtonElement } from '@infinitecanvas/core/elements'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { svg } from 'lit'
import { customElement } from 'lit/decorators.js'

const italicIcon = svg`
  <!--!Font Awesome Free 6.7.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path
    d="M128 64c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-58.7 0L160 416l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l58.7 0L224 96l-64 0c-17.7 0-32-14.3-32-32z"
  />
`
@customElement('ic-italic-button')
export class ItalicButtonElement extends SignalWatcher(AbstractButtonElement) {
  protected viewbox = '0 0 384 512'
  protected icon = italicIcon

  protected onClick(): void {
    InfiniteCanvas.instance?.commands.textEditor.toggleItalic()
  }

  public firstUpdated(): void {
    const isActive = InfiniteCanvas.instance?.store.textEditor.italic as ReadonlySignal<boolean>

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
    'ic-italic-button': ItalicButtonElement
  }
}
