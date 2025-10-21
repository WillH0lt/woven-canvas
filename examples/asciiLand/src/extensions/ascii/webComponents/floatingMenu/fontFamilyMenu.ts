import type { FontFamily, ICommands, IConfig, IStore } from '@infinitecanvas/core'
import { commandsContext, configContext, storeContext } from '@infinitecanvas/core'
import type { Text } from '@infinitecanvas/core/components'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ascii-font-family-menu')
export class AsciiFontFamilyMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

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
  `

  private getCurrentFontFamily(): string | null {
    const selectedTexts = this.store.textEditor.selectedTexts.value

    if (!selectedTexts || selectedTexts.length === 0) {
      return null
    }

    const firstFontFamily = selectedTexts[0].fontFamily
    const allSameFontFamily = selectedTexts.every((text: Text) => text.fontFamily === firstFontFamily)

    return allSameFontFamily ? firstFontFamily : null
  }

  private async selectFont(fontFamily: FontFamily): Promise<void> {
    const fontSize = fontFamily.name === 'Standard' ? 144 : 20
    const lineHeight = fontFamily.name === 'Standard' ? 1.0 : 1.2

    await this.commands.textEditor.setTextProperties({ fontFamily, lineHeight, fontSize })
  }

  private handleWheelStop(e: Event) {
    e.stopPropagation()
  }

  render() {
    const currentFontFamily = this.getCurrentFontFamily()
    const fontFamilies = this.config.textEditor.fontMenu.families.filter((family) => family.selectable)

    return html`
      <div class="menu-container" @wheel=${this.handleWheelStop} @click=${(e: Event) => e.stopPropagation()}>
        <div class="font-list">
          ${fontFamilies.map(
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
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ascii-font-family-menu': AsciiFontFamilyMenu
  }
}
