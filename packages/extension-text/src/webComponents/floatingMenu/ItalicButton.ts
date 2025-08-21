import { InfiniteCanvas } from '@infinitecanvas/core'
import { ICMenuIconButton } from '@infinitecanvas/core/elements'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-text-italic-button')
export class ICTextItalicButton extends SignalWatcher(ICMenuIconButton) {
  protected icon = html`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 384 512"
      fill="currentColor"
    >
      <!--!Font Awesome Free 6.7.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
      <path
        d="M128 64c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-58.7 0L160 416l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l58.7 0L224 96l-64 0c-17.7 0-32-14.3-32-32z"
      />
    </svg>
`

  protected onClick(): void {
    InfiniteCanvas.instance?.commands.text.toggleItalic()
  }

  public firstUpdated(): void {
    const isActive = InfiniteCanvas.instance?.store.text.italic as ReadonlySignal<boolean>

    isActive.subscribe(this.setButtonActive.bind(this))

    this.setButtonActive(isActive.value)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-italic-button': ICTextItalicButton
  }
}
