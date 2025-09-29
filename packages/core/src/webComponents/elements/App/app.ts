import { provide } from '@lit/context'
import { LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import type { ICommands, IConfig, IStore } from '../../../types'
import { commandsContext, configContext, storeContext } from '../../contexts'

@customElement('ic-app')
export class ICApp extends LitElement {
  @provide({ context: storeContext })
  @property({ attribute: false })
  store: IStore = {} as IStore

  @provide({ context: commandsContext })
  @property({ attribute: false })
  commands: ICommands = {} as ICommands

  @provide({ context: configContext })
  @property({ attribute: false })
  config: IConfig = {} as IConfig

  // Disable shadow DOM so this acts like a regular div
  protected createRenderRoot() {
    return this
  }

  public connectedCallback() {
    super.connectedCallback()
    // Since we disabled shadow DOM, we need to apply styles directly to the element
    this.style.display = 'block'
  }
}
