import { InfiniteCanvas } from '@infinitecanvas/core'
// import { buttonStyles } from '@infinitecanvas/extension-floating-menus'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { LitElement, css, html, svg } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

const chevronDownIcon = svg`
  <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
`
@customElement('ic-text-color-button')
export class TextColorButtonElement extends SignalWatcher(LitElement) {
  static styles = css`
    .button {
      display: flex;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      margin-left: 4px;
    }
    .circle {
      width: 20px;
      height: 20px;
      border-radius: 9999px;
      outline-style: solid;
      outline-width: 1px;
      outline-color: #ffffff55;
    }
    .chevron-down {
      width: 8px !important;
      margin-bottom: 2px;
      color: var(--ic-floating-menus-gray-300);
    }

    #color-menu {
      display: none;
      width: max-content;
      position: absolute;
      top: 0;
      left: 0;
      background: var(--ic-floating-menus-gray-700);
      color: var(--ic-floating-menus-gray-100);
      font-weight: bold;
      padding: 5px 10px;
      border-radius: var(--ic-floating-menus-tooltip-border-radius);
      font-size: 70%;
    }
  `

  private color!: ReadonlySignal<string>

  public connectedCallback(): void {
    super.connectedCallback()

    this.color = InfiniteCanvas.instance?.store.textEditor.color as ReadonlySignal<string>
  }

  render() {
    return html`
      <div
        class="button"
      >
        <div
          class="circle"
          style=${styleMap({
            'background-color': this.color.value,
          })}
        ></div>
        <svg
          class="chevron-down"
          viewBox="0 0 512 512"
          fill="currentColor"
        >
          ${chevronDownIcon}
        </svg>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-color-button': TextColorButtonElement
  }
}
