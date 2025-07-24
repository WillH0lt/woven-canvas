import { InfiniteCanvas } from '@infinitecanvas/core'
import { buttonStyles } from '@infinitecanvas/extension-floating-menus'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { LitElement, html, svg } from 'lit'
import { customElement } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

const italicIcon = svg`
  <!--!Font Awesome Free 6.7.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path
    d="M128 64c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-58.7 0L160 416l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l58.7 0L224 96l-64 0c-17.7 0-32-14.3-32-32z"
  />
`
@customElement('ic-italic-button')
export class ItalicButtonElement extends SignalWatcher(LitElement) {
  static styles = buttonStyles

  private isActive!: ReadonlySignal<boolean>

  public connectedCallback(): void {
    super.connectedCallback()

    this.isActive = InfiniteCanvas.instance?.store.textEditor.italic as ReadonlySignal<boolean>
  }

  render() {
    return html`
      <div class="button ${classMap({
        active: this.isActive.value,
      })}" @click="${() => InfiniteCanvas.instance?.commands.textEditor.toggleItalic()}">
        <svg
          viewBox="0 0 384 512"
          fill="currentColor"
        >
          ${italicIcon}
        </svg>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-italic-button': ItalicButtonElement
  }
}
