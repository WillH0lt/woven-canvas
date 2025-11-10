import { LitElement, css, html, isServer } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { consume } from '@lit/context'
import { SignalWatcher } from '@lit-labs/preact-signals'

import type { ICommands, IStore } from '../../../types'
import { FONT_SIZE_OPTIONS } from '../../../constants'
import { commandsContext, storeContext } from '../../contexts'

const checkIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    fill="currentColor"
    width="16"
    height="16"
  >
    <!--!Font Awesome Free 6.7.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
    <path
      d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"
    />
  </svg>
`

@customElement('ic-font-size-menu')
export class ICFontSizeMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @state()
  private fontSizeText = ''

  static styles = css`
    .menu-container {
      cursor: pointer;
      width: 150px;
    }

    .menu-container > *:first-child {
      border-top-left-radius: 0.75rem;
      border-top-right-radius: 0.75rem;
    }

    .menu-container > *:last-child {
      border-bottom-left-radius: 0.75rem;
      border-bottom-right-radius: 0.75rem;
    }

    .option-item {
      display: flex;
      align-items: center;
      height: 2.5rem;
      padding: 0 2rem;
      transition: background-color 0.2s;
    }

    .option-item.active {
      background-color: var(--ic-primary);
    }

    .option-item:not(.active):hover {
      background-color: var(--ic-gray-600);
    }

    .check-icon {
      color: white;
      width: 1rem;
      margin-right: 0.5rem;
      margin-left: -1.5rem;
    }

    .option-label {
      color: white;
    }

    .separator {
      margin: 0.25rem 0;
      width: 100%;
      height: 0.75px;
      background-color: var(--ic-gray-600);
    }

    .input-container {
      display: flex;
      position: relative;
      align-items: center;
      justify-content: center;
    }

    .custom-input {
      background-color: var(--ic-gray-700);
      width: 100%;
      margin: 0.5rem;
      border-radius: 0.375rem;
      border: none;
      padding: 0.5rem;
      color: white;
      font-size: 0.875rem;

      outline: 1px solid var(--ic-gray-600);
    }

    .custom-input:hover {
      outline: 1px solid var(--ic-gray-500);
    }

    .custom-input:focus {
      outline: 2px solid var(--ic-primary);
    }

    .px-suffix {
      position: absolute;
      right: 1rem;
      color: var(--ic-gray-400);
      font-size: 0.875rem;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    const fontSize = this.getCurrentFontSize()
    if (fontSize !== null) {
      this.updateFontSizeText(fontSize)
    }
  }

  private updateFontSizeText(fontSize: number) {
    const n = +fontSize.toFixed(1)
    this.fontSizeText = n.toString()
  }

  private setFontSize(value: number) {
    this.commands.textEditor.setFontSize(value)
    this.updateFontSizeText(value)
  }

  private handleCustomFontSize() {
    const value = Number.parseFloat(this.fontSizeText)
    if (!Number.isNaN(value) && value > 0) {
      this.setFontSize(value)
    }
  }

  private handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement
    this.fontSizeText = input.value

    this.handleCustomFontSize()
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.handleCustomFontSize()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  private handleBlur() {
    this.handleCustomFontSize()
  }

  private getCurrentFontSize(): number | null {
    const selectedTexts = this.store.textEditor.selectedTexts.value

    if (!selectedTexts || selectedTexts.length === 0) {
      return null
    }

    const firstFontSize = selectedTexts[0].fontSizePx
    const allSameSize = selectedTexts.every((text) => text.fontSizePx === firstFontSize)

    return allSameSize ? firstFontSize : null
  }

  render() {
    const currentFontSize = this.getCurrentFontSize()

    return html`
      <div class="menu-container" @click=${(e: Event) => e.stopPropagation()}>
        ${FONT_SIZE_OPTIONS.map(
          (option) => html`
          <div
            class="option-item ${currentFontSize === option.value ? 'active' : ''}"
            @click=${() => this.setFontSize(option.value)}
          >
            ${currentFontSize === option.value ? html`<div class="check-icon">${checkIcon}</div>` : ''}
            <div
              class="option-label"
              style="font-size: ${option.displayValue}px"
            >
              ${option.label}
            </div>
          </div>
        `,
        )}
        
        <div class="separator"></div>
        
        <div class="input-container">
          <input
            class="custom-input"
            .value=${this.fontSizeText}
            @input=${this.handleInputChange}
            @blur=${this.handleBlur}
            @keydown=${this.handleKeyDown}
            placeholder="Custom size"
          />
          <div class="px-suffix">px</div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-font-size-menu': ICFontSizeMenu
  }
}
