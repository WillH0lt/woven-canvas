import { consume } from '@lit/context'
import { LitElement, css, html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import tinycolor from 'tinycolor2'
import { SignalWatcher } from '@lit-labs/preact-signals'

import type { IStore } from '../../../types'
import { storeContext } from '../../contexts'

const icon = html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
    <!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
    <path d="M349.1 114.7C343.9 103.3 332.5 96 320 96C307.5 96 296.1 103.3 290.9 114.7L123.5 480L112 480C94.3 480 80 494.3 80 512C80 529.7 94.3 544 112 544L200 544C217.7 544 232 529.7 232 512C232 494.3 217.7 480 200 480L193.9 480L215.9 432L424.2 432L446.2 480L440.1 480C422.4 480 408.1 494.3 408.1 512C408.1 529.7 422.4 544 440.1 544L528.1 544C545.8 544 560.1 529.7 560.1 512C560.1 494.3 545.8 480 528.1 480L516.6 480L349.2 114.7zM394.8 368L245.2 368L320 204.8L394.8 368z"/>
  </svg>
`

@customElement('ic-text-color-button')
export class ICTextColorButton extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  static styles = css`
    .button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      margin: 0 25%;
    }

    .button svg {
      width: 90%;
      overflow: visible;
    }

    .color {
      width: 100%;
      height: 3.5px;
    }
  `

  render() {
    const color = this.store.textEditor.color
    if (!color?.value) {
      return nothing
    }

    return html`
      <div class="button">
        ${icon}
        <div class="color" style=${styleMap({
          backgroundColor: color.value,
          outline: tinycolor.isReadable(color.value, '#000000') ? 'none' : '1px solid var(--ic-gray-500)',
        })}></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-color-button': ICTextColorButton
  }
}
