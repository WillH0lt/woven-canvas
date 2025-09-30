import type { IConfig } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { LitElement, css, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import { FontLoader } from '../../../FontLoader'
import type { FontFamily, ICommands, IStore } from '../../../types'
import { commandsContext, configContext, storeContext } from '../../contexts'

const magnifyingGlassIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none" 
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    width="16"
    height="16"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
`

@customElement('ic-font-family-menu')
export class ICFontFamilyMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

  @state()
  private searchText = ''

  static styles = css`
    .menu-container {
      background-color: var(--ic-gray-700);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      border-radius: 8px;
      cursor: default;
      width: 200px;
    }

    .font-list {
      max-height: 200px;
      color: white;
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: 8px;
    }

    .font-list > :first-child {
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .font-list > :last-child {
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    .font-item {
      display: flex;
      align-items: center;
      height: 15px;
      padding: 8px;
      width: 100%;
      transition: background-color 0.2s;
      cursor: pointer;
    }

    .font-item.active {
      background-color: var(--ic-primary);
    }

    .font-item:not(.active):hover {
      background-color: var(--ic-gray-600);
    }

    .font-preview {
      filter: invert(1);
      height: 100%;
      overflow: hidden;
      object-fit: cover;
      object-position: left;
    }

    .separator {
      margin: 4px 0;
      width: 100%;
      height: 0.75px;
      background-color: var(--ic-gray-600);
    }

    .search-container {
      display: flex;
      position: relative;
      align-items: center;
      justify-content: center;
      width: 100%;
      color: white;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      width: 16px;
      color: var(--ic-gray-300);
    }

    .search-input {
      background-color: var(--ic-gray-700);
      width: 100%;
      padding-left: 32px;
      margin: 8px;
      border-radius: 6px;
      border: none;
      padding-top: 8px;
      padding-bottom: 8px;
      color: white;
      outline: 1px solid var(--ic-gray-600);
    }

    .search-input:hover {
      outline: 1px solid var(--ic-gray-500);
    }

    .search-input:focus {
      outline: 2px solid var(--ic-primary);
    }
  `

  private get filteredFontFamilies(): FontFamily[] {
    const fontFamilies = this.config.textEditor.fontMenu.families.filter((family) => family.selectable)

    if (this.searchText === '') {
      return fontFamilies
    }

    return fontFamilies.filter((family) => family.name.toLowerCase().includes(this.searchText.toLowerCase()))
  }

  private getCurrentFontFamily(): string | null {
    const selectedTexts = this.store.textEditor.selectedTexts.value

    if (!selectedTexts || selectedTexts.length === 0) {
      return null
    }

    const firstFontFamily = selectedTexts[0].fontFamily
    const allSameFontFamily = selectedTexts.every((text) => text.fontFamily === firstFontFamily)

    return allSameFontFamily ? firstFontFamily : null
  }

  private async selectFont(family: FontFamily): Promise<void> {
    await FontLoader.loadFonts([family])
    this.commands.textEditor.setFontFamily(family.name)
  }

  private handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement
    this.searchText = input.value
  }

  private handleWheelStop(e: Event) {
    e.stopPropagation()
  }

  render() {
    const currentFontFamily = this.getCurrentFontFamily()

    return html`
      <div class="menu-container" @wheel=${this.handleWheelStop} @click=${(e: Event) => e.stopPropagation()}>
        <div class="font-list">
          ${this.filteredFontFamilies.map(
            (family) => html`
              <div
                class="font-item ${currentFontFamily === family.name ? 'active' : ''}"
                @click=${() => this.selectFont(family)}
              >
                <img
                  class="font-preview"
                  src=${family.previewImage}
                  alt="${family.name}"
                  style="font-family: ${family.name}"
                />
              </div>
            `,
          )}
        </div>

        ${
          this.config.textEditor.fontMenu.showSearch
            ? html`
              <div class="separator"></div>
              
              <div class="search-container">
                <div class="search-icon">${magnifyingGlassIcon}</div>
                <input
                  class="search-input"
                  .value=${this.searchText}
                  @input=${this.handleSearchInput}
                  placeholder="Search"
                />
              </div>
            `
            : nothing
        }
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-font-family-menu': ICFontFamilyMenu
  }
}
