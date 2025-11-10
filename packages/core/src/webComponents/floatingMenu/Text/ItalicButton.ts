import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { html } from 'lit'
import { customElement } from 'lit/decorators.js'

import type { ICommands, IStore } from '../../../types'
import { ICMenuIconButton } from '../../elements'
import { commandsContext, storeContext } from '../../contexts'

@customElement('ic-text-italic-button')
export class ICTextItalicButton extends SignalWatcher(ICMenuIconButton) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

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
    this.commands.textEditor.setItalic(!this.active)
  }

  public firstUpdated(): void {
    const isActive = this.store.textEditor.italic as ReadonlySignal<boolean>

    isActive.subscribe(() => {
      this.active = isActive.value
      this.requestUpdate()
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-italic-button': ICTextItalicButton
  }
}
