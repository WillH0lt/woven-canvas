import { InfiniteCanvas } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { LitElement, css, html, svg } from 'lit'
import { customElement } from 'lit/decorators.js'

import { FONT_SIZE_OPTIONS } from '../../../constants'

const chevronDownIcon = svg`
<svg
  class="chevron-down"
  viewBox="0 0 512 512"
  fill="currentColor"
>
  <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
  <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
</svg>
`

@customElement('ic-font-size-button')
export class ICFontSizeButton extends SignalWatcher(LitElement) {
  static styles = css`
    .font-size-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.75rem;
      height: 100%;
      font-size: 0.75rem;
      line-height: 1rem;
      transition: background-color 0.2s ease;
    }

    .font-size-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.375rem;
      border-radius: 0.375rem;
      border: 1px solid transparent;
    }

    .font-size-container:hover .font-size-inner {
      border-color: var(--ic-gray-200);
    }

    .font-size-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 0.5rem;
    }

    .chevron-icon {
      width: 0.5rem;
      margin-left: auto;
      margin-bottom: 0.125rem;
      color: var(--ic-gray-300);
    }
  `

  render() {
    const label = this.getFontSizeLabel()

    return html`
      <div class="font-size-container">
        <div class="font-size-inner">
          <div class="font-size-label">${label}</div>
          <div class="chevron-icon">${chevronDownIcon}</div>
        </div>
      </div>
    `
  }

  private getFontSizeLabel(): string {
    const selectedTexts = InfiniteCanvas.instance?.store.textEditor.selectedTexts.value

    let fontSize: number | 'mixed' | null = null
    for (const text of selectedTexts ?? []) {
      if (fontSize === null) {
        fontSize = text.fontSize
      } else if (fontSize !== text.fontSize) {
        fontSize = 'mixed'
        break
      }
    }

    if (fontSize === null) {
      return ''
    }
    if (fontSize === 'mixed') {
      return 'Mixed'
    }

    const option = FONT_SIZE_OPTIONS.find((option) => option.value === fontSize)
    return option ? option.label : `${+fontSize.toFixed(1)} px`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-font-size-button': ICFontSizeButton
  }
}
